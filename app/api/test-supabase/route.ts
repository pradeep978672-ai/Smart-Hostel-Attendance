import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

  const supabase = createClient(url, key);

  // Check present columns
  const optionalCols = ['profile_photo', 'has_webauthn', 'webauthn_credential_id', 'webauthn_public_key', 'role'];
  const colResults: Record<string, boolean> = {};
  for (const col of optionalCols) {
    const { error } = await supabase.from('students').select(col).limit(1);
    colResults[col] = !error;
  }

  // Check RLS — try a test select and insert probe
  const { error: selectErr } = await supabase.from('students').select('id').limit(1);
  const { error: insertProbeErr } = await supabase
    .from('students')
    .insert([{ roll_number: '__rls_probe__', name: '__probe__', department: 'probe', room_number: 'probe', password_hash: 'probe' }]);

  // Immediately delete probe if it was inserted
  if (!insertProbeErr) {
    await supabase.from('students').delete().eq('roll_number', '__rls_probe__');
  }

  return NextResponse.json({
    columns: colResults,
    rls: {
      select_allowed: !selectErr,
      select_error: selectErr?.message ?? null,
      insert_allowed: !insertProbeErr,
      insert_error: insertProbeErr?.message ?? null,
    },
  });
}
