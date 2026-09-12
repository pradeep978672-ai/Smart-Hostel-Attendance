'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { checkDailySubmissionStatus, getStudentAttendanceHistory } from '@/services/attendanceService';
import { AttendanceWindowBadge } from '@/components/attendance/AttendanceWindowBadge';
import { Badge } from '@/components/ui/Badge';
import { getAttendanceWindowStatus, formatTimeDisplay } from '@/lib/time';
import { AttendanceRecord } from '@/types/database';
import {
  GraduationCap,
  Building2,
  DoorClosed,
  MapPin,
  Clock,
  CheckCircle2,
  ArrowRight,
  Fingerprint,
  Calendar,
  Percent,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { currentStudent, devTimeWindowBypass } = useAuth();
  const [submissionStatus, setSubmissionStatus] = useState<{
    hasSubmitted: boolean;
    record?: AttendanceRecord;
  }>({ hasSubmitted: false });

  const [historyStats, setHistoryStats] = useState({
    attendancePercentage: 0,
    recordsCount: 0,
  });

  const [mounted, setMounted] = useState<boolean>(false);
  const [windowStatus, setWindowStatus] = useState(getAttendanceWindowStatus());

  const refreshWindowStatus = async () => {
    try {
      const res = await fetch('/api/server-time', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setWindowStatus(getAttendanceWindowStatus(new Date(data.iso)));
        return;
      }
    } catch { /* fall through */ }
    setWindowStatus(getAttendanceWindowStatus());
  };

  useEffect(() => {
    setMounted(true);
    refreshWindowStatus();
    const timer = setInterval(refreshWindowStatus, 30000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentStudent) {
      checkDailySubmissionStatus(currentStudent.id).then(setSubmissionStatus);
      getStudentAttendanceHistory(currentStudent.id).then((res) => {
        setHistoryStats({
          attendancePercentage: res.attendancePercentage,
          recordsCount: res.records.length,
        });
      });
    }
  }, [currentStudent]);

  if (!currentStudent) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-sm">Please log in with your Roll Number.</p>
        <Link
          href="/login/student"
          className="mt-4 inline-block px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
        >
          Go to Student Login
        </Link>
      </div>
    );
  }

  const isWindowOpen = (mounted && windowStatus.isOpen) || devTimeWindowBypass;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Logged-in Student Profile Hero Card */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <img
            src={
              currentStudent.profile_photo ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStudent.name)}&background=0c8de9&color=fff`
            }
            alt={currentStudent.name}
            className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-800 shadow-xl shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{currentStudent.name}</h1>
              {currentStudent.has_webauthn && (
                <Badge variant="webauthn">
                  <Fingerprint className="w-3 h-3" /> WebAuthn Registered
                </Badge>
              )}
            </div>

            <p className="text-sm font-mono font-bold text-brand-400 mb-4">{currentStudent.roll_number}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-300 font-medium truncate">{currentStudent.department}</span>
              </div>
              <div className="flex items-center gap-2">
                <DoorClosed className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-300 font-medium">Room {currentStudent.room_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-300 font-medium truncate">{currentStudent.current_location || 'Hostel'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Window Status Indicator */}
      <AttendanceWindowBadge />

      {/* "Submit Today's Attendance" Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Submit Today&apos;s Attendance</h2>
              <p className="text-xs text-slate-400">Window Enforcement: 6:00 PM – 10:00 PM</p>
            </div>
          </div>

          {submissionStatus.hasSubmitted ? (
            <Badge variant="present" className="px-3 py-1 text-xs">
              <CheckCircle2 className="w-4 h-4" /> Submitted Today
            </Badge>
          ) : isWindowOpen ? (
            <Badge variant="open" className="px-3 py-1 text-xs">
              Window OPEN
            </Badge>
          ) : (
            <Badge variant="closed" className="px-3 py-1 text-xs">
              Window CLOSED
            </Badge>
          )}
        </div>

        {/* Dynamic State Banner */}
        {submissionStatus.hasSubmitted ? (
          <div className="p-5 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-emerald-200 text-sm">Attendance Recorded!</h3>
              <p className="text-xs text-emerald-300/80 mt-1">
                You have already submitted your attendance for today. Duplicate submissions are strictly prevented.
              </p>
              <p className="text-[11px] text-emerald-400/90 font-mono mt-2">
                Time: {submissionStatus.record?.submission_time ? formatTimeDisplay(submissionStatus.record.submission_time) : 'Today'} • Method: {submissionStatus.record?.auth_method}
              </p>
            </div>
          </div>
        ) : isWindowOpen ? (
          <div className="p-5 bg-sky-950/40 border border-sky-800/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sky-200 text-sm">Attendance Submission is Active</h3>
              <p className="text-xs text-sky-300/80 mt-1">
                Verify your selfie snapshot, GPS location coordinates, and password or passkey.
              </p>
            </div>
            <Link
              href="/student/submit"
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-900/40 shrink-0 transition-all transform active:scale-95"
            >
              Submit Attendance Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : windowStatus.isBeforeWindow ? (
          <div className="p-5 bg-amber-950/40 border border-amber-800/50 rounded-2xl text-center sm:text-left">
            <h3 className="font-bold text-amber-200 text-sm">Attendance has not started yet.</h3>
            <p className="text-xs text-amber-300/80 mt-1">
              The daily attendance window opens at <span className="font-bold text-amber-100">6:00 PM</span> and closes at <span className="font-bold text-amber-100">10:00 PM</span>.
            </p>
          </div>
        ) : (
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl text-center sm:text-left">
            <h3 className="font-bold text-slate-300 text-sm">Attendance is closed for today.</h3>
            <p className="text-xs text-slate-400 mt-1">
              The attendance window ended at 10:00 PM. Please submit on time tomorrow.
            </p>
          </div>
        )}
      </div>

      {/* Attendance Stats Overview Widget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">Overall Attendance Score</span>
            <h4 className="text-2xl font-black text-white">{historyStats.attendancePercentage}%</h4>
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-xl text-brand-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase text-slate-400">Submitted Logs</span>
              <h4 className="text-2xl font-black text-white">{historyStats.recordsCount} Days</h4>
            </div>
          </div>
          <Link
            href="/student/history"
            className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            View History <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
