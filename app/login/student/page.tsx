'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  isWebAuthnSupported,
  authenticateWithWebAuthn,
  verifyWebAuthnAssertion,
} from '@/lib/webauthn';
import { getStudentByRollNumber } from '@/services/studentService';
import { GraduationCap, Key, Fingerprint, Loader2, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StudentLoginPage() {
  const router = useRouter();
  const { loginAsStudent, loginWithVerifiedWebAuthn, logout } = useAuth();
  const { showToast } = useToast();

  const [rollNumber, setRollNumber] = useState('2024-CS-001');
  const [password, setPassword] = useState('Student@123');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

  // Clear any existing session when accessing the login page
  useEffect(() => {
    logout();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoll = rollNumber.trim();
    if (!cleanRoll) {
      showToast('error', 'Required Field', 'Please enter your Student Roll Number.');
      return;
    }
    setIsLoading(true);
    try {
      const ok = await loginAsStudent(cleanRoll, password);
      if (ok) {
        showToast('success', 'Student Logged In!', `Authenticated with Roll Number: ${cleanRoll.toUpperCase()}`);
        router.push('/student/dashboard');
      } else {
        showToast('error', 'Login Failed', `Roll Number "${cleanRoll}" not found or password incorrect.`);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Login error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    const cleanRoll = rollNumber.trim().toUpperCase();
    if (!cleanRoll) {
      showToast('error', 'Required Field', 'Please enter your Student Roll Number first.');
      return;
    }

    if (!isWebAuthnSupported()) {
      showToast(
        'error',
        'WebAuthn Unsupported',
        'Your browser or device does not support WebAuthn Passkeys / Biometrics. Please use your password to log in.'
      );
      return;
    }

    setIsPasskeyLoading(true);
    try {
      // 1. Fetch student by roll number to check existence and registered credential
      const student = await getStudentByRollNumber(cleanRoll);
      if (!student) {
        showToast('error', 'Student Not Found', `No student account found with Roll Number "${cleanRoll}".`);
        return;
      }

      // 2. Validate registered WebAuthn credential exists
      if (!student.has_webauthn || !student.webauthn_credential_id) {
        showToast(
          'error',
          'No Passkey Registered',
          `No WebAuthn passkey has been registered for student "${student.name}" (${cleanRoll}). Please log in with your password.`
        );
        return;
      }

      // 3. Request server cryptographic challenge
      const challengeRes = await fetch('/api/auth/webauthn/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNumber: cleanRoll }),
      });

      if (!challengeRes.ok) {
        const errData = await challengeRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to obtain WebAuthn challenge from server.');
      }

      const challengeData = await challengeRes.json();
      const serverChallenge = challengeData.challenge;

      // 4. Perform genuine WebAuthn authentication ceremony with the device
      const assertion = await authenticateWithWebAuthn(
        student.webauthn_credential_id,
        serverChallenge
      );

      // 5. Verify returned assertion with the server
      const verifyRes = await verifyWebAuthnAssertion(cleanRoll, assertion, serverChallenge);
      if (!verifyRes.success) {
        throw new Error(verifyRes.error || 'WebAuthn assertion verification failed.');
      }

      // 6. Establish student session ONLY after successful verification
      const ok = await loginWithVerifiedWebAuthn(student, assertion.credentialId);
      if (ok) {
        showToast('success', 'Biometric Passkey Verified!', `Welcome back, ${student.name}! Biometric login successful.`);
        router.push('/student/dashboard');
      } else {
        throw new Error('Failed to create authenticated student session.');
      }
    } catch (err: any) {
      // Strictly fail: NEVER log the student in on error, cancellation, or failure
      const errorMsg = err.message || 'Passkey verification failed.';
      showToast('error', 'Passkey Login Failed', `${errorMsg} You remain logged out.`);
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[140px] pointer-events-none" />

      <Link
        href="/"
        className="absolute top-6 left-6 text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-400 mb-3">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Student Portal Login</h2>
          <p className="text-xs text-slate-400 mt-1">Enter Roll Number to access your Hostel Dashboard</p>
        </div>

        <form onSubmit={handlePasswordLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-400" /> Student Roll Number *
            </label>
            <input
              type="text"
              required
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
              placeholder="e.g. 2024-CS-001"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-brand-400" /> Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-900/30 disabled:opacity-50 mt-4"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log In to Student Dashboard'}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative px-3 bg-slate-900 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            Or Use Biometric Auth
          </span>
        </div>

        <button
          type="button"
          onClick={handlePasskeyLogin}
          disabled={isPasskeyLoading}
          className="w-full py-3 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 text-purple-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isPasskeyLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Fingerprint className="w-4 h-4 text-purple-400" /> Sign In with WebAuthn Passkey / Touch ID
            </>
          )}
        </button>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Hostel Admin?{' '}
            <Link href="/login/admin" className="text-purple-400 hover:underline font-semibold">
              Admin Portal Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
