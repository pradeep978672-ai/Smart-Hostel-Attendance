import { NextRequest, NextResponse } from 'next/server';
import { getStudentByRollNumber } from '@/services/studentService';
import { matchCredentialId } from '@/lib/webauthn';
import { Student } from '@/types/database';

function parseBase64URL(str: string): Buffer {
  const clean = (str || '').trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = clean.padEnd(clean.length + (4 - (clean.length % 4)) % 4, '=');
  return Buffer.from(padded, 'base64');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanRoll = (body.rollNumber || '').trim().toUpperCase();
    const assertion = body.assertion;

    if (!cleanRoll) {
      return NextResponse.json({ error: 'Roll number is required.' }, { status: 400 });
    }

    if (!assertion || !assertion.credentialId || !assertion.clientDataJSON || !assertion.authenticatorData) {
      return NextResponse.json({ error: 'Incomplete WebAuthn assertion.' }, { status: 400 });
    }

    const student = await getStudentByRollNumber(cleanRoll);
    if (!student) {
      return NextResponse.json(
        { error: `No student found with Roll Number "${cleanRoll}".` },
        { status: 404 }
      );
    }

    if (!student.has_webauthn || !student.webauthn_credential_id) {
      return NextResponse.json(
        {
          error: `No WebAuthn passkey has been registered for student "${student.name}". Please log in with your password.`,
        },
        { status: 400 }
      );
    }

    // 1. Verify credential ID matches student registered credential
    const isCredMatch = matchCredentialId(assertion.credentialId, student.webauthn_credential_id);
    if (!isCredMatch) {
      return NextResponse.json(
        {
          error: 'WebAuthn credential mismatch. The returned passkey is not registered to this student account.',
        },
        { status: 401 }
      );
    }

    // 2. Decode and verify clientDataJSON
    let clientData: any;
    try {
      const clientDataBuf = parseBase64URL(assertion.clientDataJSON);
      const clientDataStr = clientDataBuf.toString('utf-8');
      clientData = JSON.parse(clientDataStr);
    } catch {
      return NextResponse.json({ error: 'Malformed clientDataJSON.' }, { status: 400 });
    }

    if (clientData.type !== 'webauthn.get') {
      return NextResponse.json(
        { error: `Invalid ceremony type. Expected "webauthn.get", got "${clientData.type}".` },
        { status: 400 }
      );
    }

    // 3. Verify Challenge if cookie or body parameter present
    const cookieVal = req.cookies.get('webauthn_challenge')?.value;
    if (cookieVal) {
      // Decode URI component if cookie was encoded
      const decodedCookie = decodeURIComponent(cookieVal);
      const [cookieRoll, cookieChallenge] = decodedCookie.split(':');
      if (cookieRoll === cleanRoll && cookieChallenge) {
        const clientChallengeNorm = (clientData.challenge || '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
        const cookieChallengeNorm = cookieChallenge.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
        if (clientChallengeNorm !== cookieChallengeNorm) {
          return NextResponse.json(
            { error: 'WebAuthn challenge mismatch. Authentication attempt rejected.' },
            { status: 401 }
          );
        }
      }
    } else if (body.expectedChallenge) {
      const clientChallengeNorm = (clientData.challenge || '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
      const expectedNorm = body.expectedChallenge.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
      if (clientChallengeNorm !== expectedNorm) {
        return NextResponse.json(
          { error: 'WebAuthn cryptographic challenge mismatch.' },
          { status: 401 }
        );
      }
    }

    // 4. Verify Authenticator Data Flags
    const authDataBuf = parseBase64URL(assertion.authenticatorData);
    if (authDataBuf.length < 37) {
      return NextResponse.json({ error: 'Authenticator data buffer is too short.' }, { status: 400 });
    }

    const flags = authDataBuf[32];
    const userPresent = (flags & 0x01) !== 0;
    const userVerified = (flags & 0x04) !== 0;
    if (!userPresent || !userVerified) {
      return NextResponse.json(
        { error: 'Biometric user verification (Touch ID / Face ID / Windows Hello / PIN) was not verified by authenticator.' },
        { status: 401 }
      );
    }

    // 5. Verify signature existence
    const sigBuf = parseBase64URL(assertion.signature);
    if (sigBuf.length === 0) {
      return NextResponse.json({ error: 'Authenticator signature is empty.' }, { status: 400 });
    }

    // Sanitize student record (never return password_hash)
    const sanitizedStudent: Student = { ...student };
    delete sanitizedStudent.password_hash;

    const response = NextResponse.json({
      success: true,
      verified: true,
      student: sanitizedStudent,
    });

    // Clear challenge cookie
    response.cookies.delete('webauthn_challenge');

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'WebAuthn assertion verification failed.' },
      { status: 500 }
    );
  }
}
