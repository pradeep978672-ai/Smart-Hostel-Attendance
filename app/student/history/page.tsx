'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getStudentAttendanceHistory } from '@/services/attendanceService';
import { AttendanceRecord } from '@/types/database';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { formatDateDisplay, formatTimeDisplay } from '@/lib/time';
import { History, Percent, Calendar, CheckCircle2, ShieldCheck, MapPin, Fingerprint, Key, ArrowLeft, RefreshCw } from 'lucide-react';

export default function MyAttendanceHistoryPage() {
  const { currentStudent } = useAuth();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [percentage, setPercentage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHistory = async () => {
    if (!currentStudent) return;
    setIsLoading(true);
    try {
      const res = await getStudentAttendanceHistory(currentStudent.id);
      setHistory(res.records);
      setPercentage(res.attendancePercentage);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentStudent]);

  if (!currentStudent) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-sm">Please log in to view history.</p>
        <Link href="/login/student" className="mt-4 inline-block px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold">
          Student Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-brand-400" /> My Attendance History
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Logs for <span className="font-bold text-slate-200">{currentStudent.name}</span> ({currentStudent.roll_number})
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Overall Attendance Rate"
          value={`${percentage}%`}
          subtitle="Monthly Benchmark"
          icon={<Percent className="w-5 h-5" />}
          color={percentage >= 75 ? 'green' : 'amber'}
        />
        <StatCard
          title="Present Submissions"
          value={history.length}
          subtitle="Recorded Logs"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Hostel Room"
          value={currentStudent.room_number}
          subtitle={currentStudent.department}
          icon={<Calendar className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Attendance History Log Table */}
      <div className="w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Historical Logs</h3>
          <span className="text-xs text-slate-400 font-semibold">{history.length} Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/40 text-slate-400 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Submission Time</th>
                <th className="px-5 py-4">Verification Location</th>
                <th className="px-5 py-4">Auth Method</th>
                <th className="px-5 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500 italic">
                    No attendance records found yet. Submit today&apos;s attendance between 6:00 PM and 10:00 PM.
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-100">
                      {formatDateDisplay(record.attendance_date || record.date)}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {formatTimeDisplay(record.submission_time)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                        <span className="truncate max-w-[200px]" title={record.location_address || 'Hostel'}>
                          {record.location_address || 'Hostel Premises'}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {record.auth_method === 'WEBAUTHN_PASSKEY' ? (
                        <Badge variant="webauthn">
                          <Fingerprint className="w-3 h-3" /> Passkey
                        </Badge>
                      ) : (
                        <Badge variant="neutral">
                          <Key className="w-3 h-3 text-slate-400" /> Password
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Badge variant={record.status === 'PRESENT' ? 'present' : 'absent'}>
                        {record.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
