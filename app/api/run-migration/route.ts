import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/run-migration
 * Applies the missing-columns migration using the Supabase service role key.
 * The service role key must be set as SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (server-only, no NEXT_PUBLIC_ prefix — never exposed to the browser).
 */
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY is not set in .env.local.',
        hint: 'Go to Supabase Dashboard → Settings → API → Service Role Key, add it as SUPABASE_SERVICE_ROLE_KEY in .env.local, then restart the dev server.',
        migration_sql: getMigrationSql(),
      },
      { status: 400 }
    );
  }

  // Service role key bypasses RLS and can run DDL via supabase-js
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const statements = [
    `ALTER TABLE public.students ADD COLUMN IF NOT EXISTS profile_photo TEXT`,
    `ALTER TABLE public.students ADD COLUMN IF NOT EXISTS has_webauthn BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE public.students ADD COLUMN IF NOT EXISTS webauthn_credential_id TEXT`,
    `ALTER TABLE public.students ADD COLUMN IF NOT EXISTS webauthn_public_key TEXT`,
    `ALTER TABLE public.students ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('ADMIN', 'STUDENT'))`,
  ];

  const results: Array<{ sql: string; ok: boolean; error?: string }> = [];

  for (const sql of statements) {
    const { error } = await supabase.rpc('exec_migration', { sql_statement: sql });
    if (error) {
      // exec_migration doesn't exist — try creating it first
      results.push({ sql, ok: false, error: error.message });
    } else {
      results.push({ sql, ok: true });
    }
  }

  // Reload PostgREST schema cache
  await supabase.rpc('exec_migration', {
    sql_statement: `SELECT pg_notify('pgrst', 'reload schema')`,
  });

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, results });
}

export async function GET() {
  // Return the migration SQL so users can run it manually
  return NextResponse.json({ migration_sql: getMigrationSql() });
}

function getMigrationSql() {
  return `-- Safe migration: add missing columns to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS profile_photo TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS has_webauthn BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS webauthn_credential_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS webauthn_public_key TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('ADMIN', 'STUDENT'));
SELECT pg_notify('pgrst', 'reload schema');`;
}
