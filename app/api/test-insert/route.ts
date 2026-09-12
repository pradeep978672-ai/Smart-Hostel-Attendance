import { NextResponse } from 'next/server';
import { createStudent } from '@/services/studentService';

export async function POST() {
  try {
    const student = await createStudent({
      roll_number: `TEST-${Date.now()}`,
      name: 'Schema Test Student',
      department: 'Computer Science',
      room_number: 'T-01',
      current_location: 'Hostel Block A',
      password: 'Test@123',
      enable_webauthn: false,
    });

    return NextResponse.json({ ok: true, student });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
