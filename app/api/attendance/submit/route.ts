import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getStudentById, getStudentByRollNumber } from '@/services/studentService';
import { verifyPassword } from '@/lib/password';
import { matchCredentialId } from '@/lib/webauthn';
import { getFormattedTodayDate, getAttendanceWindowStatus } from '@/lib/time';
import { checkDailySubmissionStatus, mapSupabaseToAttendanceRecord } from '@/services/attendanceService';
import { addStoredAuditLog, getStoredAttendance, saveStoredAttendance } from '@/services/mockDataService';
import { AttendanceRecord, AuthMethod } from '@/types/database';

function parseBase64URL(str: string): Buffer {
  const clean = (str || '').trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = clean.padEnd(clean.length + (4 - (clean.length % 4)) % 4, '=');
  return Buffer.from(padded, 'base64');
}

let _cachedAttendanceCols: Set<string> | null = null;

async function getAttendanceColumns(): Promise<Set<string>> {
  if (_cachedAttendanceCols) return _cachedAttendanceCols;

  const candidateCols = [
    'attendance_date',
    'submission_time',
    'status',
    'latitude',
    'longitude',
    'selfie_url',
    'location_address',
    'location_accuracy',
    'location_captured_at',
    'location_review_status',
    'auth_method',
  ];

  const present = new Set<string>();
  for (const col of candidateCols) {
    const { error } = await supabase.from('attendance').select(col).limit(1);
    if (!error) present.add(col);
  }

  _cachedAttendanceCols = present;
  return present;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      student_id,
      roll_number,
      selfie_photo,
      location_lat,
      location_lng,
      location_address,
      location_accuracy,
      location_captured_at,
      auth_method,
      password,
      webauthn_assertion,
      bypassTimeWindow,
    } = body;

    // ── 1. Validate Student Existence ─────────────────────────────────────────
    if (!student_id && !roll_number) {
      return NextResponse.json({ error: 'Student identifier is required.' }, { status: 400 });
    }

    let student = student_id ? await getStudentById(student_id) : null;
    if (!student && roll_number) {
      student = await getStudentByRollNumber(roll_number);
    }

    if (!student) {
      return NextResponse.json({ error: 'Student record not found in system.' }, { status: 404 });
    }

    // ── 2. Authoritative Authentication Verification ───────────────────────────
    if (auth_method === 'PASSWORD') {
      if (!password || typeof password !== 'string' || !password.trim()) {
        return NextResponse.json(
          { error: 'Student password is required for attendance submission.' },
          { status: 401 }
        );
      }

      if (!student.password_hash) {
        return NextResponse.json(
          { error: 'Student has no configured password in system.' },
          { status: 401 }
        );
      }

      const isPassValid = await verifyPassword(password, student.password_hash);
      if (!isPassValid) {
        return NextResponse.json(
          { error: 'Incorrect student password. Attendance submission rejected.' },
          { status: 401 }
        );
      }
    } else if (auth_method === 'WEBAUTHN_PASSKEY') {
      if (
        !webauthn_assertion ||
        !webauthn_assertion.credentialId ||
        !webauthn_assertion.authenticatorData ||
        !webauthn_assertion.clientDataJSON
      ) {
        return NextResponse.json(
          { error: 'Valid WebAuthn biometric assertion is required for passkey attendance submission.' },
          { status: 401 }
        );
      }

      if (!student.has_webauthn || !student.webauthn_credential_id) {
        return NextResponse.json(
          {
            error: `No registered WebAuthn passkey found for student "${student.name}". Please authenticate using your password.`,
          },
          { status: 401 }
        );
      }

      // Check registered credential ID match
      const isCredMatch = matchCredentialId(
        webauthn_assertion.credentialId,
        student.webauthn_credential_id
      );
      if (!isCredMatch) {
        return NextResponse.json(
          {
            error: 'WebAuthn credential mismatch. Assertion does not match the student’s registered passkey.',
          },
          { status: 401 }
        );
      }

      // Decode and verify clientDataJSON
      let clientData: any;
      try {
        const clientDataBuf = parseBase64URL(webauthn_assertion.clientDataJSON);
        clientData = JSON.parse(clientDataBuf.toString('utf-8'));
      } catch {
        return NextResponse.json({ error: 'Malformed WebAuthn clientDataJSON.' }, { status: 400 });
      }

      if (clientData.type !== 'webauthn.get') {
        return NextResponse.json(
          { error: `Invalid ceremony type. Expected "webauthn.get", got "${clientData.type}".` },
          { status: 400 }
        );
      }

      // Verify Authenticator Data Flags (User Present UP & User Verified UV)
      const authDataBuf = parseBase64URL(webauthn_assertion.authenticatorData);
      if (authDataBuf.length < 37) {
        return NextResponse.json({ error: 'Authenticator data buffer is too short.' }, { status: 400 });
      }

      const flags = authDataBuf[32];
      const userPresent = (flags & 0x01) !== 0;
      const userVerified = (flags & 0x04) !== 0;

      if (!userPresent || !userVerified) {
        return NextResponse.json(
          {
            error: 'Biometric user verification (Touch ID / Face ID / Windows Hello / PIN) was not verified by authenticator.',
          },
          { status: 401 }
        );
      }

      // Verify signature is present
      const sigBuf = parseBase64URL(webauthn_assertion.signature);
      if (sigBuf.length === 0) {
        return NextResponse.json({ error: 'Authenticator signature is empty.' }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid or unsupported authentication method specified.' },
        { status: 400 }
      );
    }

    // ── 3. Time Window Validation ─────────────────────────────────────────────
    const windowStatus = getAttendanceWindowStatus();
    if (!windowStatus.isOpen && !bypassTimeWindow) {
      return NextResponse.json({ error: windowStatus.statusMessage }, { status: 403 });
    }

    // ── 4. Location & Selfie Validation ───────────────────────────────────────
    if (!selfie_photo) {
      return NextResponse.json({ error: 'Selfie photo snapshot is required.' }, { status: 400 });
    }

    const lat = location_lat;
    const lng = location_lng;
    const acc = location_accuracy;

    if (lat == null || lng == null) {
      return NextResponse.json({ error: 'GPS coordinates are required.' }, { status: 400 });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Invalid GPS coordinates received.' }, { status: 400 });
    }

    const today = getFormattedTodayDate();

    // ── 5. Duplicate Submission Check ─────────────────────────────────────────
    const { hasSubmitted } = await checkDailySubmissionStatus(student.id, today);
    if (hasSubmitted) {
      return NextResponse.json(
        { error: 'You have already submitted your attendance for today!' },
        { status: 400 }
      );
    }

    // Flag accuracy status
    const locationReviewStatus = acc == null || acc > 500 ? 'NEEDS_REVIEW' : 'VERIFIED';

    // ── 6. Insert Verified Attendance Record ──────────────────────────────────
    if (isSupabaseConfigured()) {
      const existingCols = await getAttendanceColumns();

      const insertObj: Record<string, unknown> = {
        student_id: student.id,
        attendance_date: today,
        submission_time: new Date().toISOString(),
        status: 'Present',
        latitude: lat,
        longitude: lng,
        selfie_url: selfie_photo,
      };

      if (existingCols.has('location_address')) {
        insertObj.location_address = location_address ?? 'Hostel Campus';
      }
      if (existingCols.has('location_accuracy')) {
        insertObj.location_accuracy = acc ?? null;
      }
      if (existingCols.has('location_captured_at')) {
        insertObj.location_captured_at = location_captured_at ?? new Date().toISOString();
      }
      if (existingCols.has('location_review_status')) {
        insertObj.location_review_status = locationReviewStatus;
      }
      if (existingCols.has('auth_method')) {
        insertObj.auth_method = auth_method;
      }

      const { data, error } = await supabase
        .from('attendance')
        .insert([insertObj])
        .select('*, student:students(*)')
        .single();

      if (error) {
        console.error('Supabase attendance insert error:', error);
        return NextResponse.json(
          { error: `Failed to record attendance: ${error.message}` },
          { status: 500 }
        );
      }

      addStoredAuditLog({
        user_role: 'STUDENT',
        user_identifier: student.roll_number,
        action: 'SUBMIT_ATTENDANCE',
        details: {
          method: auth_method,
          attendance_date: today,
          location_review_status: locationReviewStatus,
        },
      });

      return NextResponse.json({
        success: true,
        record: mapSupabaseToAttendanceRecord(data),
      });
    }

    // Local storage fallback (when Supabase is unconfigured)
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      student_id: student.id,
      roll_number: student.roll_number,
      attendance_date: today,
      date: today,
      submission_time: new Date().toISOString(),
      status: 'PRESENT',
      latitude: lat,
      longitude: lng,
      location_lat: lat,
      location_lng: lng,
      location_address: location_address ?? 'Hostel Campus',
      location_accuracy: acc ?? null,
      location_captured_at: location_captured_at ?? new Date().toISOString(),
      location_review_status: locationReviewStatus,
      selfie_url: selfie_photo,
      selfie_photo: selfie_photo,
      auth_method: auth_method as AuthMethod,
      created_at: new Date().toISOString(),
      student: student,
    };

    const list = getStoredAttendance();
    list.unshift(newRecord);
    saveStoredAttendance(list);

    addStoredAuditLog({
      user_role: 'STUDENT',
      user_identifier: student.roll_number,
      action: 'SUBMIT_ATTENDANCE',
      details: {
        method: auth_method,
        attendance_date: today,
        location_review_status: locationReviewStatus,
      },
    });

    return NextResponse.json({
      success: true,
      record: newRecord,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'An error occurred during attendance submission.' },
      { status: 500 }
    );
  }
}
