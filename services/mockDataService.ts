import { Student, AttendanceRecord, AuditLog } from '@/types/database';

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 's1-uuid-101',
    roll_number: '2024-CS-001',
    name: 'Aarav Sharma',
    department: 'Computer Science',
    room_number: 'A-201',
    current_location: 'Hostel Block A, Floor 2',
    profile_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    has_webauthn: true,
    role: 'STUDENT',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 's2-uuid-102',
    roll_number: '2024-CS-002',
    name: 'Diya Patel',
    department: 'Computer Science',
    room_number: 'A-202',
    current_location: 'Hostel Block A, Floor 2',
    profile_photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    has_webauthn: false,
    role: 'STUDENT',
    created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
  },
  {
    id: 's3-uuid-103',
    roll_number: '2024-EC-015',
    name: 'Rohan Verma',
    department: 'Electronic Communication Engineering',
    room_number: 'B-104',
    current_location: 'Hostel Block B, Floor 1',
    profile_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    has_webauthn: true,
    role: 'STUDENT',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 's4-uuid-104',
    roll_number: '2024-ME-008',
    name: 'Ananya Gupta',
    department: 'Mechanical',
    room_number: 'C-305',
    current_location: 'Hostel Block C, Floor 3',
    profile_photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    has_webauthn: false,
    role: 'STUDENT',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 's5-uuid-105',
    roll_number: '2024-EE-022',
    name: 'Vikram Singh',
    department: 'Cyber Security',
    room_number: 'B-210',
    current_location: 'Hostel Block B, Floor 2',
    profile_photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    has_webauthn: true,
    role: 'STUDENT',
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
];

const todayDate = new Date().toISOString().split('T')[0];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    student_id: 's1-uuid-101',
    roll_number: '2024-CS-001',
    attendance_date: todayDate,
    date: todayDate,
    submission_time: new Date().toISOString(),
    status: 'PRESENT',
    location_lat: 28.6139,
    location_lng: 77.2090,
    location_address: 'Block A, Hostel Campus, Main Gate',
    selfie_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    auth_method: 'WEBAUTHN_PASSKEY',
    created_at: new Date().toISOString(),
  },
  {
    id: 'att-2',
    student_id: 's3-uuid-103',
    roll_number: '2024-EC-015',
    attendance_date: todayDate,
    date: todayDate,
    submission_time: new Date(Date.now() - 1800000).toISOString(),
    status: 'PRESENT',
    location_lat: 28.6142,
    location_lng: 77.2095,
    location_address: 'Block B Library Commons',
    selfie_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    auth_method: 'PASSWORD',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    user_role: 'ADMIN',
    user_identifier: 'ADMIN-001',
    action: 'SYSTEM_INITIALIZED',
    details: { message: 'Hostel Attendance System Initialized' },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

// Helper to access LocalStorage cache for seamless dev experience
const STORAGE_KEYS = {
  STUDENTS: 'hostel_app_students',
  ATTENDANCE: 'hostel_app_attendance',
  AUDIT: 'hostel_app_audit',
};

export const getStoredStudents = (): Student[] => {
  if (typeof window === 'undefined') return INITIAL_STUDENTS;
  const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    return INITIAL_STUDENTS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_STUDENTS;
  }
};

export const saveStoredStudents = (students: Student[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
};

export const getStoredAttendance = (): AttendanceRecord[] => {
  if (typeof window === 'undefined') return INITIAL_ATTENDANCE;
  const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(INITIAL_ATTENDANCE));
    return INITIAL_ATTENDANCE;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_ATTENDANCE;
  }
};

export const saveStoredAttendance = (records: AttendanceRecord[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
};

export const getStoredAuditLogs = (): AuditLog[] => {
  if (typeof window === 'undefined') return INITIAL_AUDIT_LOGS;
  const data = localStorage.getItem(STORAGE_KEYS.AUDIT);
  if (!data) return INITIAL_AUDIT_LOGS;
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
};

export const addStoredAuditLog = (log: Omit<AuditLog, 'id' | 'created_at'>): void => {
  if (typeof window === 'undefined') return;
  const logs = getStoredAuditLogs();
  const newLog: AuditLog = {
    ...log,
    id: `log-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  logs.unshift(newLog);
  localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(logs));
};
