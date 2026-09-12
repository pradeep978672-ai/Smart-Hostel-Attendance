import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { AttendanceRecord, AttendanceStats, AttendanceStatus, AuthMethod, Student } from '@/types/database';
import { getFormattedTodayDate, getAttendanceWindowStatus } from '@/lib/time';
import { getAllStudents } from './studentService';
import { getStoredAttendance, saveStoredAttendance, addStoredAuditLog } from './mockDataService';

// ---------------------------------------------------------------------------
// Runtime column cache — detects which optional columns exist in the live
// attendance table so we never send columns that don't exist in Supabase.
// ---------------------------------------------------------------------------
let _cachedAttendanceColumns: Set<string> | null = null;

async function getAttendanceColumns(): Promise<Set<string>> {
  if (_cachedAttendanceColumns) return _cachedAttendanceColumns;

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

  _cachedAttendanceColumns = present;
  return present;
}

export function invalidateAttendanceColumnCache() {
  _cachedAttendanceColumns = null;
}

/**
 * Maps raw Supabase attendance row to strongly typed AttendanceRecord
 */
export function mapSupabaseToAttendanceRecord(row: any): AttendanceRecord {
  const rawStatus = (row.status || '').toUpperCase();
  let status: AttendanceStatus = 'NOT_SUBMITTED';
  if (rawStatus === 'PRESENT') {
    status = 'PRESENT';
  } else if (rawStatus === 'ABSENT') {
    status = 'ABSENT';
  }
  const attDate = row.attendance_date || row.date || '';

  return {
    id: row.id,
    student_id: row.student_id,
    roll_number: row.student?.roll_number || row.roll_number || '',
    attendance_date: attDate,
    date: attDate,
    submission_time: row.submission_time || row.created_at || '',
    status: status,
    latitude: row.latitude ?? row.location_lat ?? null,
    longitude: row.longitude ?? row.location_lng ?? null,
    location_lat: row.latitude ?? row.location_lat ?? null,
    location_lng: row.longitude ?? row.location_lng ?? null,
    location_address: row.location_address || 'Hostel Campus',
    location_accuracy: row.location_accuracy ?? null,
    location_captured_at: row.location_captured_at ?? row.submission_time ?? null,
    location_review_status: row.location_review_status ?? 'VERIFIED',
    selfie_url: row.selfie_url || row.selfie_photo || null,
    selfie_photo: row.selfie_url || row.selfie_photo || null,
    auth_method: (row.auth_method as AuthMethod) || 'PASSWORD',
    created_at: row.created_at || '',
    student: row.student,
  };
}

export interface SubmitAttendancePayload {
  student_id: string;
  roll_number: string;
  selfie_photo: string;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  location_accuracy?: number;     // GPS accuracy radius in metres
  location_captured_at?: string;  // ISO timestamp of GPS capture on client
  auth_method: AuthMethod;
  bypassTimeWindow?: boolean; // For dev testing mode
}

export const checkDailySubmissionStatus = async (
  studentId: string,
  dateString: string = getFormattedTodayDate()
): Promise<{ hasSubmitted: boolean; record?: AttendanceRecord }> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, student:students(*)')
      .eq('student_id', studentId)
      .eq('attendance_date', dateString)
      .maybeSingle();

    if (error) {
      console.error('Supabase daily submission check error:', error);
      // Fall through to localStorage on network error
    } else if (data) {
      return { hasSubmitted: true, record: mapSupabaseToAttendanceRecord(data) };
    } else {
      return { hasSubmitted: false };
    }
  }

  const list = getStoredAttendance();
  const found = list.find(
    (rec) =>
      rec.student_id === studentId &&
      (rec.attendance_date === dateString || rec.date === dateString)
  );
  return { hasSubmitted: Boolean(found), record: found };
};

export const submitAttendance = async (
  payload: SubmitAttendancePayload
): Promise<AttendanceRecord> => {
  const windowStatus = getAttendanceWindowStatus();

  // Enforce 6:00 PM - 10:00 PM time window unless explicitly bypassed in dev test mode
  if (!windowStatus.isOpen && !payload.bypassTimeWindow) {
    throw new Error(windowStatus.statusMessage);
  }

  const today = getFormattedTodayDate();

  // Check duplicate submission on same day
  const { hasSubmitted } = await checkDailySubmissionStatus(payload.student_id, today);
  if (hasSubmitted) {
    throw new Error('You have already submitted your attendance for today!');
  }

  if (isSupabaseConfigured()) {
    // ── Server-side location validation ─────────────────────────────────
    const lat = payload.location_lat;
    const lng = payload.location_lng;
    const acc = payload.location_accuracy;

    if (lat == null || lng == null) {
      throw new Error('GPS location is required to submit attendance.');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Invalid GPS coordinates received. Please retry.');
    }

    // Flag if accuracy is very poor (>500 m)
    const locationReviewStatus =
      acc == null || acc > 500 ? 'NEEDS_REVIEW' : 'VERIFIED';

    const existingCols = await getAttendanceColumns();

    const insertObj: Record<string, unknown> = {
      student_id: payload.student_id,
      attendance_date: today,
      submission_time: new Date().toISOString(),
      status: 'Present',
      latitude: lat,
      longitude: lng,
      selfie_url: payload.selfie_photo,
    };

    if (existingCols.has('location_address')) {
      insertObj.location_address = payload.location_address ?? 'Hostel Campus';
    }
    if (existingCols.has('location_accuracy')) {
      insertObj.location_accuracy = acc ?? null;
    }
    if (existingCols.has('location_captured_at')) {
      insertObj.location_captured_at = payload.location_captured_at ?? null;
    }
    if (existingCols.has('location_review_status')) {
      insertObj.location_review_status = locationReviewStatus;
    }
    if (existingCols.has('auth_method')) {
      insertObj.auth_method = payload.auth_method;
    }

    const { data, error } = await supabase
      .from('attendance')
      .insert([insertObj])
      .select('*, student:students(*)')
      .single();

    if (error) {
      console.error('Supabase attendance insert error:', error);
      throw new Error(`Failed to submit attendance: ${error.message}`);
    }

    addStoredAuditLog({
      user_role: 'STUDENT',
      user_identifier: payload.roll_number,
      action: 'SUBMIT_ATTENDANCE',
      details: {
        method: payload.auth_method,
        attendance_date: today,
        location_review_status: locationReviewStatus,
      },
    });

    return mapSupabaseToAttendanceRecord(data);
  }

  // localStorage fallback (Supabase not configured)
  const newRecord: AttendanceRecord = {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    student_id: payload.student_id,
    roll_number: payload.roll_number,
    attendance_date: today,
    date: today,
    submission_time: new Date().toISOString(),
    status: 'PRESENT',
    latitude: payload.location_lat ?? 0,
    longitude: payload.location_lng ?? 0,
    location_lat: payload.location_lat ?? 0,
    location_lng: payload.location_lng ?? 0,
    location_address: payload.location_address ?? 'Hostel Campus',
    selfie_url: payload.selfie_photo,
    selfie_photo: payload.selfie_photo,
    auth_method: payload.auth_method,
    created_at: new Date().toISOString(),
  };

  const list = getStoredAttendance();
  list.unshift(newRecord);
  saveStoredAttendance(list);

  addStoredAuditLog({
    user_role: 'STUDENT',
    user_identifier: payload.roll_number,
    action: 'SUBMIT_ATTENDANCE',
    details: { method: payload.auth_method, attendance_date: today },
  });

  return newRecord;
};

/**
 * Fetches ALL registered students from the Supabase `students` table and attaches
 * their attendance record for the specified date.
 * - If student has attendance with status = PRESENT -> 'PRESENT'
 * - If student has attendance with status = ABSENT -> 'ABSENT'
 * - If no attendance record exists for this date -> 'NOT_SUBMITTED'
 */
export const getAllStudentsWithAttendance = async (
  dateString: string = getFormattedTodayDate()
): Promise<AttendanceRecord[]> => {
  if (isSupabaseConfigured()) {
    // 1. Fetch all registered students from Supabase
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .order('roll_number', { ascending: true });

    if (studentsError) {
      console.error('Supabase fetch students error (getAllStudentsWithAttendance):', studentsError);
      throw new Error(`Failed to fetch students from Supabase: ${studentsError.message}`);
    }

    const students: Student[] = studentsData ?? [];

    // 2. Fetch attendance rows for the specified date
    let attendanceRows: any[] = [];
    const { data: attDateRows, error: attDateErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('attendance_date', dateString);

    if (attDateErr) {
      // Fallback if column is named 'date' in some environments
      const { data: legacyDateRows, error: legacyDateErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', dateString);

      if (!legacyDateErr && legacyDateRows) {
        attendanceRows = legacyDateRows;
      }
    } else if (attDateRows) {
      attendanceRows = attDateRows;
    }

    // Index attendance rows by student_id and roll_number for fast lookup
    const attMap = new Map<string, any>();
    for (const row of attendanceRows) {
      if (row.student_id) {
        attMap.set(row.student_id, row);
      }
      if (row.roll_number) {
        attMap.set(row.roll_number.trim().toUpperCase(), row);
      }
    }

    // 3. Assemble full list starting from every registered student
    return students.map((student) => {
      const attRow =
        attMap.get(student.id) ||
        attMap.get((student.roll_number || '').trim().toUpperCase());

      if (attRow) {
        return mapSupabaseToAttendanceRecord({
          ...attRow,
          student: student,
        });
      }

      // No attendance submitted yet for this date -> NOT_SUBMITTED
      return {
        id: `unsubmitted-${student.id}`,
        student_id: student.id,
        roll_number: student.roll_number,
        attendance_date: dateString,
        date: dateString,
        submission_time: '',
        status: 'NOT_SUBMITTED' as AttendanceStatus,
        latitude: null,
        longitude: null,
        location_lat: null,
        location_lng: null,
        location_address: null,
        location_accuracy: null,
        location_captured_at: null,
        location_review_status: null,
        selfie_url: null,
        selfie_photo: null,
        auth_method: 'PASSWORD' as AuthMethod,
        created_at: '',
        student: student,
      };
    });
  }

  // LocalStorage / Mock Data Fallback
  const allStudents = await getAllStudents();
  const list = getStoredAttendance();
  const dailyList = list.filter(
    (r) => r.attendance_date === dateString || r.date === dateString
  );

  const attMap = new Map<string, AttendanceRecord>();
  for (const row of dailyList) {
    if (row.student_id) attMap.set(row.student_id, row);
    if (row.roll_number) attMap.set(row.roll_number.trim().toUpperCase(), row);
  }

  return allStudents.map((student) => {
    const attRow =
      attMap.get(student.id) ||
      attMap.get((student.roll_number || '').trim().toUpperCase());

    if (attRow) {
      return {
        ...attRow,
        attendance_date: attRow.attendance_date || attRow.date || dateString,
        date: attRow.attendance_date || attRow.date || dateString,
        student: student,
      };
    }

    return {
      id: `unsubmitted-${student.id}`,
      student_id: student.id,
      roll_number: student.roll_number,
      attendance_date: dateString,
      date: dateString,
      submission_time: '',
      status: 'NOT_SUBMITTED' as AttendanceStatus,
      latitude: null,
      longitude: null,
      location_lat: null,
      location_lng: null,
      location_address: null,
      location_accuracy: null,
      location_captured_at: null,
      location_review_status: null,
      selfie_url: null,
      selfie_photo: null,
      auth_method: 'PASSWORD' as AuthMethod,
      created_at: '',
      student: student,
    };
  });
};

/**
 * Returns all records with attendance for the day (starts from students table).
 */
export const getDailyAttendance = async (
  dateString: string = getFormattedTodayDate()
): Promise<AttendanceRecord[]> => {
  return getAllStudentsWithAttendance(dateString);
};

export const getStudentAttendanceHistory = async (
  studentId: string,
  rollNumber?: string
): Promise<{ records: AttendanceRecord[]; attendancePercentage: number }> => {
  let records: AttendanceRecord[] = [];

  if (isSupabaseConfigured()) {
    // Primary query by student_id
    let { data, error } = await supabase
      .from('attendance')
      .select('*, student:students(*)')
      .eq('student_id', studentId)
      .order('attendance_date', { ascending: false });

    // Fallback if attendance_date column is absent or named differently
    if (error) {
      const retry = await supabase
        .from('attendance')
        .select('*, student:students(*)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (!retry.error) {
        data = retry.data;
        error = null;
      }
    }

    if (error) {
      console.error('Supabase student history fetch error:', error);
      throw new Error(`Failed to fetch attendance history: ${error.message}`);
    }

    records = (data ?? []).map(mapSupabaseToAttendanceRecord);
  } else {
    const list = getStoredAttendance();
    const cleanRoll = (rollNumber || '').trim().toUpperCase();
    records = list
      .filter((r) => r.student_id === studentId || (cleanRoll && r.roll_number?.toUpperCase() === cleanRoll))
      .map((r) => ({
        ...r,
        attendance_date: r.attendance_date || r.date || '',
        date: r.attendance_date || r.date || '',
      }));
  }

  const totalDays = 30; // 30-day baseline for percentage calculation
  const presentDays = records.filter((r) => r.status === 'PRESENT').length;
  const percentage = Math.min(100, Math.round((presentDays / Math.max(1, totalDays)) * 100));

  return {
    records,
    attendancePercentage: percentage,
  };
};

export const getAttendanceStats = async (
  dateString: string = getFormattedTodayDate()
): Promise<AttendanceStats> => {
  const allRecords = await getAllStudentsWithAttendance(dateString);

  const totalStudents = allRecords.length;
  const presentCount = allRecords.filter((r) => r.status === 'PRESENT').length;
  const absentCount = Math.max(0, totalStudents - presentCount);
  const attendancePercentage =
    totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return {
    totalStudents,
    presentCount,
    absentCount,
    attendancePercentage,
  };
};
