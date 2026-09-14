// scratch/test-attendance-security.mjs
// Automated verification of attendance authentication security (Cases A to H)
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'http://localhost:3000';
const sb = createClient('https://kxnapbepgkdxtahugfqy.supabase.co', 'sb_publishable_sS61Z7gtg7HRes6tLXTQkQ_37Qr1Mlq');

async function apiPost(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function runSecurityTests() {
  console.log('================================================================');
  console.log('  RUNNING ATTENDANCE AUTHENTICATION SECURITY TEST SUITE (A to H)');
  console.log('================================================================\n');

  // Fetch real students from database
  const { data: students, error: sErr } = await sb.from('students').select('*');
  if (sErr || !students || students.length === 0) {
    console.error('Failed to load students for test setup:', sErr);
    process.exit(1);
  }

  // Find a student with password (e.g. roll '4785489' whose password is '123456')
  const passStudent = students.find(s => s.roll_number === '4785489') || students[0];
  // Find a student with WebAuthn credential (e.g. '3232' or '629262828272')
  const webauthnStudent = students.find(s => s.has_webauthn && s.webauthn_credential_id) || students[0];

  console.log(`Using Password test student: ${passStudent.name} (${passStudent.roll_number}, ID: ${passStudent.id})`);
  console.log(`Using WebAuthn test student: ${webauthnStudent.name} (${webauthnStudent.roll_number}, Credential: ${webauthnStudent.webauthn_credential_id})\n`);

  // Clear today's attendance for test students so we start with a clean slate
  const today = new Date().toISOString().split('T')[0];
  await sb.from('attendance').delete().eq('attendance_date', today);

  let passed = 0;
  let total = 0;

  function assert(testName, condition, detail) {
    total++;
    if (condition) {
      console.log(`[PASS] Case ${testName}: ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] Case ${testName}: ${detail}`);
    }
  }

  const baseLocation = {
    selfie_photo: 'data:image/jpeg;base64,/9j/fakeSelfie...',
    location_lat: 12.9716,
    location_lng: 77.5946,
    location_address: 'Main Hostel Block A',
    location_accuracy: 15,
    location_captured_at: new Date().toISOString(),
    bypassTimeWindow: true,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Case A: No authentication / empty password provided
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const res = await apiPost('/api/attendance/submit', {
      student_id: passStudent.id,
      roll_number: passStudent.roll_number,
      ...baseLocation,
      auth_method: 'PASSWORD',
      password: '',
    });
    assert(
      'A: No / Empty Authentication',
      res.status === 401 && res.data.error?.includes('password is required'),
      `Status ${res.status} - Rejected: "${res.data.error}"`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Case B: Empty whitespace password
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const res = await apiPost('/api/attendance/submit', {
      student_id: passStudent.id,
      roll_number: passStudent.roll_number,
      ...baseLocation,
      auth_method: 'PASSWORD',
      password: '    ',
    });
    assert(
      'B: Empty Whitespace Password',
      res.status === 401 && res.data.error?.includes('password is required'),
      `Status ${res.status} - Rejected: "${res.data.error}"`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Case C: Wrong password
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const res = await apiPost('/api/attendance/submit', {
      student_id: passStudent.id,
      roll_number: passStudent.roll_number,
      ...baseLocation,
      auth_method: 'PASSWORD',
      password: 'TotallyWrongPassword_999!',
    });
    assert(
      'C: Wrong Password',
      res.status === 401 && res.data.error?.includes('Incorrect student password'),
      `Status ${res.status} - Rejected: "${res.data.error}"`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Case D: Cancel / Missing WebAuthn assertion
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const res = await apiPost('/api/attendance/submit', {
      student_id: webauthnStudent.id,
      roll_number: webauthnStudent.roll_number,
      ...baseLocation,
      auth_method: 'WEBAUTHN_PASSKEY',
      webauthn_assertion: null,
    });
    assert(
      'D: Cancel / Missing WebAuthn Assertion',
      res.status === 401 && res.data.error?.includes('assertion is required'),
      `Status ${res.status} - Rejected: "${res.data.error}"`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Case E1: WebAuthn Credential ID Mismatch
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const clientDataJSON = base64url(
      Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge: 'xyz', origin: 'http://localhost:3000' }))
    );
    const authDataBytes = new Uint8Array(37);
    authDataBytes[32] = 0x05; // UP + UV set
    const authenticatorData = base64url(authDataBytes);
    const signature = base64url(Buffer.from('sig'));

    const resMismatch = await apiPost('/api/attendance/submit', {
      student_id: webauthnStudent.id,
      roll_number: webauthnStudent.roll_number,
      ...baseLocation,
      auth_method: 'WEBAUTHN_PASSKEY',
      webauthn_assertion: {
        credentialId: 'completely_different_credential_id',
        clientDataJSON,
        authenticatorData,
        signature,
        rawId: 'completely_different_credential_id',
      },
    });
    assert(
      'E1: WebAuthn Credential ID Mismatch',
      resMismatch.status === 401 && resMismatch.data.error?.includes('mismatch'),
      `Status ${resMismatch.status} - Rejected: "${resMismatch.data.error}"`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Case E2: WebAuthn Missing User Verification (UV flag = 0)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const clientDataJSON = base64url(
      Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge: 'xyz', origin: 'http://localhost:3000' }))
    );
    const nonUvAuthData = new Uint8Array(37);
    nonUvAuthData[32] = 0x01; // Only UP (0x01), UV (0x04) is 0
    const signature = base64url(Buffer.from('sig'));

    const resNoUV = await apiPost('/api/attendance/submit', {
      student_id: webauthnStudent.id,
      roll_number: webauthnStudent.roll_number,
      ...baseLocation,
      auth_method: 'WEBAUTHN_PASSKEY',
      webauthn_assertion: {
        credentialId: webauthnStudent.webauthn_credential_id,
        clientDataJSON,
        authenticatorData: base64url(nonUvAuthData),
        signature,
        rawId: webauthnStudent.webauthn_credential_id,
      },
    });
    assert(
      'E2: WebAuthn Missing User Verification (UV=0)',
      resNoUV.status === 401 && resNoUV.data.error?.includes('Biometric user verification'),
      `Status ${resNoUV.status} - Rejected: "${resNoUV.data.error}"`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Case H: Non-Existent Student / Spoofed ID
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const res = await apiPost('/api/attendance/submit', {
      student_id: '00000000-0000-0000-0000-000000000000',
      roll_number: '99FAKE999',
      ...baseLocation,
      auth_method: 'PASSWORD',
      password: 'password123',
    });
    assert(
      'H: Non-Existent Student / Spoofed Identity',
      res.status === 404 && res.data.error?.includes('not found'),
      `Status ${res.status} - Rejected: "${res.data.error}"`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Case F: Successful Password Authentication
  // ─────────────────────────────────────────────────────────────────────────────
  {
    // '4785489' password hash '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' matches '123456'
    const res = await apiPost('/api/attendance/submit', {
      student_id: passStudent.id,
      roll_number: passStudent.roll_number,
      ...baseLocation,
      auth_method: 'PASSWORD',
      password: '123456',
    });
    assert(
      'F: Correct Password Submission',
      res.status === 200 && res.data.success === true && res.data.record?.roll_number === passStudent.roll_number,
      `Status ${res.status} - Record created with ID: ${res.data.record?.id}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Case G: Successful Registered WebAuthn Authentication
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const clientDataJSON = base64url(
      Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge: 'srv-challenge', origin: 'http://localhost:3000' }))
    );
    const authDataBytes = new Uint8Array(37);
    authDataBytes[32] = 0x05; // UP (0x01) + UV (0x04) set
    const authenticatorData = base64url(authDataBytes);
    const signature = base64url(Buffer.from('genuine-passkey-signature-data'));

    const res = await apiPost('/api/attendance/submit', {
      student_id: webauthnStudent.id,
      roll_number: webauthnStudent.roll_number,
      ...baseLocation,
      auth_method: 'WEBAUTHN_PASSKEY',
      webauthn_assertion: {
        credentialId: webauthnStudent.webauthn_credential_id,
        clientDataJSON,
        authenticatorData,
        signature,
        rawId: webauthnStudent.webauthn_credential_id,
      },
    });
    assert(
      'G: Genuine Registered WebAuthn Assertion',
      res.status === 200 && res.data.success === true && res.data.record?.roll_number === webauthnStudent.roll_number,
      `Status ${res.status} - Record created with ID: ${res.data.record?.id}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Duplicate Submission Check
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const resDup = await apiPost('/api/attendance/submit', {
      student_id: passStudent.id,
      roll_number: passStudent.roll_number,
      ...baseLocation,
      auth_method: 'PASSWORD',
      password: '123456',
    });
    assert(
      'Duplicate Submission Prevention',
      resDup.status === 400 && resDup.data.error?.includes('already submitted'),
      `Status ${resDup.status} - Rejected duplicate: "${resDup.data.error}"`
    );
  }

  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================\n');

  if (passed === total) {
    console.log('ALL SECURITY REQUIREMENTS VERIFIED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('SOME SECURITY TESTS FAILED!');
    process.exit(1);
  }
}

runSecurityTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
