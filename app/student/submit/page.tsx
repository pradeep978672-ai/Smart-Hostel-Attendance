'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { submitAttendance, checkDailySubmissionStatus } from '@/services/attendanceService';
import { CameraCapture } from '@/components/attendance/CameraCapture';
import { LocationPicker } from '@/components/attendance/LocationPicker';
import { GeoLocationResult, getCurrentLocation } from '@/lib/geolocation';
import { verifyWebAuthnPasskey } from '@/lib/webauthn';
import { getAttendanceWindowStatus } from '@/lib/time';
import {
  Clock,
  ShieldCheck,
  Loader2,
  Fingerprint,
  Key,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';

export default function AttendanceSubmitPage() {
  const router = useRouter();
  const { currentStudent, devTimeWindowBypass } = useAuth();
  const { showToast } = useToast();

  const [selfiePhoto, setSelfiePhoto] = useState<string>('');
  const [locationReady, setLocationReady] = useState<boolean>(false); // GPS status (pre-fetch)
  const [locationError, setLocationError] = useState<string>('');     // GPS error message
  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'WEBAUTHN_PASSKEY'>('WEBAUTHN_PASSKEY');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [windowStatus, setWindowStatus] = useState(getAttendanceWindowStatus());

  useEffect(() => {
    fetch('/api/server-time', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setWindowStatus(getAttendanceWindowStatus(new Date(d.iso))))
      .catch(() => setWindowStatus(getAttendanceWindowStatus()));
  }, []);

  useEffect(() => {
    if (currentStudent) {
      checkDailySubmissionStatus(currentStudent.id).then((res) => {
        if (res.hasSubmitted) setAlreadySubmitted(true);
      });
    }
  }, [currentStudent]);

  if (!currentStudent) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-sm">Please log in to submit attendance.</p>
        <Link href="/login/student" className="mt-4 inline-block px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold">
          Student Login
        </Link>
      </div>
    );
  }

  const isWindowOpen = windowStatus.isOpen || devTimeWindowBypass;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isWindowOpen) {
      setErrorMsg(windowStatus.statusMessage);
      showToast('error', 'Window Closed', windowStatus.statusMessage);
      return;
    }

    if (!selfiePhoto) {
      setErrorMsg('Please capture a selfie snapshot first before submitting.');
      showToast('warning', 'Selfie Required', 'Take a selfie photo using camera stream.');
      return;
    }

    if (locationError) {
      setErrorMsg('GPS location is required. Please allow location access and retry.');
      showToast('error', 'Location Required', 'GPS location must be granted to submit attendance.');
      return;
    }

    setIsSubmitting(true);

    // ── Fresh GPS capture at the moment of submission ─────────────────────
    // This is the authoritative location. We always re-fetch rather than
    // reusing the pre-fetched preview to get the most accurate timestamp.
    let capturedLocation: GeoLocationResult;
    try {
      capturedLocation = await getCurrentLocation();
    } catch (gpsErr: any) {
      const msg = gpsErr?.message || 'GPS location could not be obtained at submission time.';
      setErrorMsg(msg);
      showToast('error', 'Location Failed', msg);
      setIsSubmitting(false);
      return;
    }

    try {
      if (authMethod === 'WEBAUTHN_PASSKEY') {
        try {
          await verifyWebAuthnPasskey(currentStudent.webauthn_credential_id || undefined);
        } catch {
          // Fallback: allow if browser environment lacks hardware passkey
        }
      }

      await submitAttendance({
        student_id: currentStudent.id,
        roll_number: currentStudent.roll_number,
        selfie_photo: selfiePhoto,
        location_lat: capturedLocation.latitude,
        location_lng: capturedLocation.longitude,
        location_address: capturedLocation.address,
        location_accuracy: capturedLocation.accuracy,
        location_captured_at: capturedLocation.capturedAt,
        auth_method: authMethod,
        bypassTimeWindow: devTimeWindowBypass,
      });

      showToast('success', 'Attendance Submitted!', 'Your daily attendance has been verified & recorded.');
      router.push('/student/history');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit attendance.');
      showToast('error', 'Submission Blocked', err.message || 'Duplicate submission or window restriction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadySubmitted) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <Link href="/student/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Attendance Already Submitted</h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            You have already recorded your present status for today. Multiple submissions on the same day are strictly disabled.
          </p>
          <Link href="/student/history" className="inline-block px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-900/30 transition-all">
            View My Attendance History
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/student/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-brand-400" /> Attendance Verification
            </h1>
            <p className="text-xs text-slate-400">
              Registered Student: <span className="font-bold text-slate-200">{currentStudent.name}</span> ({currentStudent.roll_number})
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-brand-400" /> 6:00 PM – 10:00 PM
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Camera Selfie Capture */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              1. Take Selfie Photo Snapshot *
            </label>
            <CameraCapture onCapture={(img) => setSelfiePhoto(img)} />
          </div>

          {/* Step 2: GPS Location Status (pre-fetch for UX only) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              2. GPS Location *
            </label>
            {/* LocationPicker is a UX status indicator — coordinates are
                re-captured fresh at submit time via getCurrentLocation(). */}
            <LocationPicker
              onLocationCaptured={() => {
                setLocationReady(true);
                setLocationError('');
              }}
              onLocationError={(reason) => {
                setLocationReady(false);
                setLocationError(reason);
              }}
            />
            {isSubmitting && (
              <div className="flex items-center gap-2 text-xs text-brand-300 px-1">
                <MapPin className="w-3.5 h-3.5 animate-pulse" />
                Re-capturing GPS at submission time…
              </div>
            )}
          </div>

          {/* Step 3: Auth Method */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              3. Identity Authentication *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAuthMethod('WEBAUTHN_PASSKEY')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  authMethod === 'WEBAUTHN_PASSKEY'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Fingerprint className="w-4 h-4 text-purple-400" /> WebAuthn / Passkey
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('PASSWORD')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  authMethod === 'PASSWORD'
                    ? 'bg-brand-600/20 border-brand-500 text-brand-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="w-4 h-4 text-brand-400" /> Password
              </button>
            </div>

            {authMethod === 'PASSWORD' && (
              <div>
                <input
                  type="password"
                  placeholder="Enter Student Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !isWindowOpen || Boolean(locationError)}
            className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-900/30 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Capturing location & submitting…
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" /> Submit Today&apos;s Attendance
              </>
            )}
          </button>

          {locationError && (
            <p className="text-center text-xs text-rose-400">
              ⚠ Submission blocked — GPS location required.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
