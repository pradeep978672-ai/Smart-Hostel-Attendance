import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getStudentByRollNumber } from '@/services/studentService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanRoll = (body.rollNumber || '').trim().toUpperCase();

    if (!cleanRoll) {
      return NextResponse.json({ error: 'Roll number is required.' }, { status: 400 });
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
          error: `No WebAuthn passkey has been registered for student "${student.name}" (${cleanRoll}). Please log in with your password.`,
        },
        { status: 400 }
      );
    }

    // Generate 32-byte cryptographically secure random challenge
    const challengeBuffer = crypto.randomBytes(32);
    const challenge = challengeBuffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = NextResponse.json({
      challenge,
      credentialId: student.webauthn_credential_id,
      studentName: student.name,
      rollNumber: student.roll_number,
    });

    // Store challenge in HTTP-only cookie with 5-minute expiry
    response.cookies.set('webauthn_challenge', `${cleanRoll}:${challenge}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate WebAuthn challenge.' },
      { status: 500 }
    );
  }
}
