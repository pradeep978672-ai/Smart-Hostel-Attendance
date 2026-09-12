import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Student } from '@/types/database';
import { getStoredStudents, saveStoredStudents } from './mockDataService';
import { logAuditAction } from './auditService';
import { hashPassword } from '@/lib/password';

// ---------------------------------------------------------------------------
// Runtime column cache — detects which optional columns exist in the live
// students table so we never send columns that haven't been migrated yet.
// ---------------------------------------------------------------------------
let _cachedStudentColumns: Set<string> | null = null;

async function getStudentColumns(): Promise<Set<string>> {
  if (_cachedStudentColumns) return _cachedStudentColumns;

  const optionalCols = [
    'profile_photo',
    'has_webauthn',
    'webauthn_credential_id',
    'webauthn_public_key',
    'role',
  ];

  const present = new Set<string>();
  for (const col of optionalCols) {
    const { error } = await supabase.from('students').select(col).limit(1);
    if (!error) present.add(col);
  }

  _cachedStudentColumns = present;
  return present;
}

/** Invalidate the column cache (call after a successful migration) */
export function invalidateStudentColumnCache() {
  _cachedStudentColumns = null;
}

export interface CreateStudentPayload {
  roll_number: string;
  name: string;
  department: string;
  room_number: string;
  current_location?: string;
  profile_photo?: string;
  password?: string;
  enable_webauthn?: boolean;
  webauthn_credential_id?: string;
  webauthn_public_key?: string;
}

export const getAllStudents = async (): Promise<Student[]> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error (getAllStudents):', error);
      throw new Error(`Failed to load students from Supabase: ${error.message}`);
    }
    return (data ?? []) as Student[];
  }

  return getStoredStudents();
};

export const getStudentByRollNumber = async (rollNumber: string): Promise<Student | null> => {
  const cleanRoll = (rollNumber || '').trim();
  if (!cleanRoll) return null;

  if (isSupabaseConfigured()) {
    // 1. Primary search: exact case-insensitive match on roll_number
    const { data: byRoll, error: errorRoll } = await supabase
      .from('students')
      .select('*')
      .ilike('roll_number', cleanRoll)
      .maybeSingle();

    if (errorRoll) {
      console.error('Supabase query error (getStudentByRollNumber - roll):', errorRoll);
    }

    if (byRoll) {
      return byRoll as Student;
    }

    // 2. Secondary fallback: check name column (case-insensitive) in case the identifier is a name
    const { data: byName, error: errorName } = await supabase
      .from('students')
      .select('*')
      .ilike('name', cleanRoll)
      .maybeSingle();

    if (errorName) {
      console.error('Supabase query error (getStudentByRollNumber - name):', errorName);
    }

    if (byName) {
      return byName as Student;
    }

    return null;
  }

  const list = getStoredStudents();
  const cleanLower = cleanRoll.toLowerCase();
  const found =
    list.find((s) => s.roll_number.trim().toLowerCase() === cleanLower) ||
    list.find((s) => s.name.trim().toLowerCase() === cleanLower);
  return found || null;
};

export const getStudentById = async (id: string): Promise<Student | null> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Supabase query error (getStudentById):', error);
      throw new Error(`Failed to fetch student by ID: ${error.message}`);
    }
    return (data as Student) || null;
  }

  const list = getStoredStudents();
  return list.find((s) => s.id === id) || null;
};

export const createStudent = async (payload: CreateStudentPayload): Promise<Student> => {
  const cleanRoll = payload.roll_number.trim().toUpperCase();

  // Check for duplicate roll number first
  const existing = await getStudentByRollNumber(cleanRoll);
  if (existing) {
    throw new Error(`Student with Roll Number "${cleanRoll}" already exists.`);
  }

  const defaultPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.name.trim())}&background=0c8de9&color=fff`;

  if (isSupabaseConfigured()) {
    // Detect which optional columns exist in the live table to avoid
    // schema cache errors when columns haven't been migrated yet.
    const existingOptionalCols = await getStudentColumns();

    const rawPassword = payload.password || 'Student@123';
    const hashedPassword = await hashPassword(rawPassword);

    const insertObj: Record<string, unknown> = {
      roll_number: cleanRoll,
      name: payload.name.trim(),
      department: payload.department.trim(),
      room_number: payload.room_number.trim(),
      current_location: payload.current_location?.trim() || 'Hostel Block',
      password_hash: hashedPassword,
    };

    // Include optional columns only if they exist in the table
    if (existingOptionalCols.has('profile_photo')) {
      insertObj.profile_photo = payload.profile_photo || defaultPhoto;
    }
    if (existingOptionalCols.has('has_webauthn')) {
      insertObj.has_webauthn = Boolean(payload.enable_webauthn);
    }
    if (existingOptionalCols.has('webauthn_credential_id')) {
      insertObj.webauthn_credential_id = payload.webauthn_credential_id || null;
    }
    if (existingOptionalCols.has('webauthn_public_key')) {
      insertObj.webauthn_public_key = payload.webauthn_public_key || null;
    }
    if (existingOptionalCols.has('role')) {
      insertObj.role = 'STUDENT';
    }

    const { data, error } = await supabase
      .from('students')
      .insert([insertObj])
      .select()
      .single();

    if (error) {
      console.error('Supabase student insert error:', error);
      throw new Error(`Failed to register student in Supabase: ${error.message}`);
    }

    await logAuditAction({
      user_role: 'ADMIN',
      user_identifier: 'ADMIN',
      action: 'ADD_STUDENT',
      details: { roll_number: cleanRoll, name: payload.name.trim() },
    });

    return data as Student;
  }

  // Local storage fallback only if Supabase is unconfigured
  const rawPassword = payload.password || 'Student@123';
  const hashedPassword = await hashPassword(rawPassword);

  const newStudent: Student = {
    id: `student-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    roll_number: cleanRoll,
    name: payload.name.trim(),
    department: payload.department.trim(),
    room_number: payload.room_number.trim(),
    current_location: payload.current_location?.trim() || 'Hostel Block',
    profile_photo: payload.profile_photo || defaultPhoto,
    password_hash: hashedPassword,
    has_webauthn: Boolean(payload.enable_webauthn),
    webauthn_credential_id: payload.webauthn_credential_id || null,
    webauthn_public_key: payload.webauthn_public_key || null,
    role: 'STUDENT',
    created_at: new Date().toISOString(),
  };

  const list = getStoredStudents();
  list.unshift(newStudent);
  saveStoredStudents(list);

  await logAuditAction({
    user_role: 'ADMIN',
    user_identifier: 'ADMIN',
    action: 'ADD_STUDENT',
    details: { roll_number: cleanRoll, name: payload.name.trim() },
  });

  return newStudent;
};

export const updateStudent = async (id: string, payload: Partial<CreateStudentPayload>): Promise<Student> => {
  const existing = await getStudentById(id);
  if (!existing) {
    throw new Error('Student record not found.');
  }

  const updateFields: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name) updateFields.name = payload.name.trim();
  if (payload.department) updateFields.department = payload.department.trim();
  if (payload.room_number) updateFields.room_number = payload.room_number.trim();
  if (payload.current_location) updateFields.current_location = payload.current_location.trim();
  if (payload.profile_photo) updateFields.profile_photo = payload.profile_photo;
  if (payload.enable_webauthn !== undefined) updateFields.has_webauthn = payload.enable_webauthn;
  if (payload.password) updateFields.password_hash = await hashPassword(payload.password);

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('students')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase student update error:', error);
      throw new Error(`Failed to update student in Supabase: ${error.message}`);
    }

    await logAuditAction({
      user_role: 'ADMIN',
      user_identifier: 'ADMIN',
      action: 'UPDATE_STUDENT',
      details: { roll_number: existing.roll_number },
    });

    return data as Student;
  }

  // Local storage update fallback when unconfigured
  const updatedStudent: Student = {
    ...existing,
    ...(payload.name ? { name: payload.name.trim() } : {}),
    ...(payload.department ? { department: payload.department.trim() } : {}),
    ...(payload.room_number ? { room_number: payload.room_number.trim() } : {}),
    ...(payload.current_location ? { current_location: payload.current_location.trim() } : {}),
    ...(payload.profile_photo ? { profile_photo: payload.profile_photo } : {}),
    ...(payload.enable_webauthn !== undefined ? { has_webauthn: payload.enable_webauthn } : {}),
    ...(payload.password ? { password_hash: await hashPassword(payload.password) } : {}),
    updated_at: updateFields.updated_at,
  };

  const list = getStoredStudents();
  const index = list.findIndex((s) => s.id === id);
  if (index !== -1) {
    list[index] = updatedStudent;
    saveStoredStudents(list);
  }

  await logAuditAction({
    user_role: 'ADMIN',
    user_identifier: 'ADMIN',
    action: 'UPDATE_STUDENT',
    details: { roll_number: existing.roll_number },
  });

  return updatedStudent;
};

export const deleteStudent = async (id: string): Promise<boolean> => {
  const existing = await getStudentById(id);
  if (!existing) return false;

  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
      console.error('Supabase student delete error:', error);
      throw new Error(`Failed to delete student from Supabase: ${error.message}`);
    }

    await logAuditAction({
      user_role: 'ADMIN',
      user_identifier: 'ADMIN',
      action: 'DELETE_STUDENT',
      details: { roll_number: existing.roll_number, name: existing.name },
    });

    return true;
  }

  const list = getStoredStudents().filter((s) => s.id !== id);
  saveStoredStudents(list);

  await logAuditAction({
    user_role: 'ADMIN',
    user_identifier: 'ADMIN',
    action: 'DELETE_STUDENT',
    details: { roll_number: existing.roll_number, name: existing.name },
  });

  return true;
};

export const searchStudents = (students: Student[], query: string): Student[] => {
  if (!query || !query.trim()) return students;
  const q = query.trim().toLowerCase();
  return students.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.roll_number.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q) ||
      s.room_number.toLowerCase().includes(q)
  );
};
