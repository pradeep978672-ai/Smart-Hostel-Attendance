export type UserRole = 'ADMIN' | 'STUDENT';

export interface Student {
  id: string;
  roll_number: string;
  name: string;
  department: string;
  room_number: string;
  current_location: string;
  profile_photo: string;
  password_hash?: string;
  has_webauthn: boolean;
  webauthn_credential_id?: string | null;
  webauthn_public_key?: string | null;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'NOT_SUBMITTED';
export type AuthMethod = 'PASSWORD' | 'WEBAUTHN_PASSKEY';

export type LocationReviewStatus = 'VERIFIED' | 'NEEDS_REVIEW';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  roll_number: string;
  attendance_date: string; // YYYY-MM-DD (Supabase schema column)
  date?: string; // alias for backwards compatibility
  submission_time: string; // ISO Timestamp
  status: AttendanceStatus;
  latitude?: number | null;
  longitude?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
  location_accuracy?: number | null;   // GPS accuracy in metres
  location_captured_at?: string | null; // ISO timestamp of GPS capture
  location_review_status?: LocationReviewStatus | null; // VERIFIED | NEEDS_REVIEW
  selfie_url?: string | null;
  selfie_photo?: string | null;
  auth_method: AuthMethod;
  created_at: string;
  student?: Student;
}

export interface AuditLog {
  id: string;
  user_role: UserRole;
  user_identifier: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export interface AttendanceWindowStatus {
  isOpen: boolean;
  statusMessage: string;
  timeRemainingText?: string;
  isBeforeWindow: boolean;
  isAfterWindow: boolean;
  currentServerTime: string;
}

export interface AttendanceStats {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
}
