-- ============================================================
-- SAFE MIGRATION: Fix schema mismatch for Hostel Attendance System
-- Project: kxnapbepgkdxtahugfqy.supabase.co
-- Generated: 2026-09-09
--
-- SAFE: Uses IF NOT EXISTS / DO $$ blocks — re-runnable without errors.
-- Does NOT drop or modify existing columns or data.
-- ============================================================

-- ── 1. ADD MISSING COLUMNS TO students TABLE ─────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS profile_photo TEXT;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS has_webauthn BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS webauthn_credential_id TEXT;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS webauthn_public_key TEXT;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'STUDENT'
    CHECK (role IN ('ADMIN', 'STUDENT'));

-- ── 2. FIX ROW LEVEL SECURITY POLICIES ───────────────────────
-- Enable RLS on all tables (safe if already enabled)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first so we can recreate cleanly
DROP POLICY IF EXISTS "Allow public read students"   ON public.students;
DROP POLICY IF EXISTS "Allow public insert students" ON public.students;
DROP POLICY IF EXISTS "Allow public update students" ON public.students;
DROP POLICY IF EXISTS "Allow public delete students" ON public.students;

DROP POLICY IF EXISTS "Allow public read attendance"   ON public.attendance;
DROP POLICY IF EXISTS "Allow public insert attendance" ON public.attendance;

DROP POLICY IF EXISTS "Allow public read audit_logs"   ON public.audit_logs;
DROP POLICY IF EXISTS "Allow public insert audit_logs" ON public.audit_logs;

-- students: full CRUD for anon role
CREATE POLICY "Allow public read students"
  ON public.students FOR SELECT USING (true);

CREATE POLICY "Allow public insert students"
  ON public.students FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update students"
  ON public.students FOR UPDATE USING (true);

CREATE POLICY "Allow public delete students"
  ON public.students FOR DELETE USING (true);

-- attendance: read + insert for anon role
CREATE POLICY "Allow public read attendance"
  ON public.attendance FOR SELECT USING (true);

CREATE POLICY "Allow public insert attendance"
  ON public.attendance FOR INSERT WITH CHECK (true);

-- audit_logs: read + insert for anon role
CREATE POLICY "Allow public read audit_logs"
  ON public.audit_logs FOR SELECT USING (true);

CREATE POLICY "Allow public insert audit_logs"
  ON public.audit_logs FOR INSERT WITH CHECK (true);

-- ── 3. RELOAD SCHEMA CACHE ───────────────────────────────────
-- Forces PostgREST to pick up the new columns immediately
SELECT pg_notify('pgrst', 'reload schema');


-- ── 4. ADD GPS ACCURACY COLUMNS TO attendance TABLE ──────────
-- These columns store enhanced location data captured at submission.
-- location_accuracy  : GPS accuracy radius in metres (lower = more precise)
-- location_review_status : VERIFIED (accuracy ≤ 500 m) | NEEDS_REVIEW (low accuracy / possible mock GPS)
-- location_captured_at   : ISO timestamp when the GPS reading was taken on the client

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC(10, 2);

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS location_review_status VARCHAR(20)
    DEFAULT 'VERIFIED'
    CHECK (location_review_status IN ('VERIFIED', 'NEEDS_REVIEW'));

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS location_captured_at TIMESTAMPTZ;

-- Reload schema cache again after attendance table changes
SELECT pg_notify('pgrst', 'reload schema');
