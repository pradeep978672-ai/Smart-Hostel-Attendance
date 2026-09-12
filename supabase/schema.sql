-- ==========================================
-- HOSTEL ATTENDANCE MANAGEMENT SYSTEM SCHEMA
-- Tables: students, attendance, audit_logs
-- ==========================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    current_location TEXT DEFAULT 'Hostel Premises',
    profile_photo TEXT,
    password_hash TEXT NOT NULL,
    has_webauthn BOOLEAN DEFAULT FALSE,
    webauthn_credential_id TEXT,
    webauthn_public_key TEXT,
    role VARCHAR(20) DEFAULT 'STUDENT' CHECK (role IN ('ADMIN', 'STUDENT')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    roll_number VARCHAR(50) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    submission_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT')),
    location_lat NUMERIC(10, 7),
    location_lng NUMERIC(10, 7),
    location_address TEXT,
    selfie_photo TEXT,
    auth_method VARCHAR(50) DEFAULT 'PASSWORD' CHECK (auth_method IN ('PASSWORD', 'WEBAUTHN_PASSKEY')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_student_daily_attendance UNIQUE (student_id, date)
);

-- 3. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_role VARCHAR(20) NOT NULL,
    user_identifier VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR FAST QUERYING & SEARCH
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON public.students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(name);
CREATE INDEX IF NOT EXISTS idx_students_dept ON public.students(department);
CREATE INDEX IF NOT EXISTS idx_students_room ON public.students(room_number);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated & anon clients (custom policy can be tuned in Supabase dashboard)
CREATE POLICY "Allow public read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow public insert students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update students" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Allow public delete students" ON public.students FOR DELETE USING (true);

CREATE POLICY "Allow public read attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Allow public insert attendance" ON public.attendance FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
