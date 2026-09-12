'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2, Lock } from 'lucide-react';
import { getAttendanceWindowStatus, formatTimeDisplay } from '@/lib/time';
import { AttendanceWindowStatus } from '@/types/database';
import { useAuth } from '@/context/AuthContext';

async function fetchServerTime(): Promise<Date> {
  try {
    const res = await fetch('/api/server-time', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return new Date(data.iso);
    }
  } catch {
    // fall back to local time if API unreachable
  }
  return new Date();
}

export const AttendanceWindowBadge: React.FC = () => {
  const { devTimeWindowBypass, setDevTimeWindowBypass } = useAuth();
  const [mounted, setMounted] = useState<boolean>(false);
  const [windowStatus, setWindowStatus] = useState<AttendanceWindowStatus | null>(null);
  const [liveTime, setLiveTime] = useState<string>('');

  // Store server-to-client time offset in milliseconds
  const timeOffsetRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    let isSubscribed = true;

    // Synchronize with server time
    const syncServerTime = async () => {
      const serverDate = await fetchServerTime();
      if (!isSubscribed) return;
      timeOffsetRef.current = serverDate.getTime() - Date.now();
      const currentSyncTime = new Date(Date.now() + timeOffsetRef.current);
      const status = getAttendanceWindowStatus(currentSyncTime);
      setWindowStatus(status);
      setLiveTime(formatTimeDisplay(currentSyncTime.toISOString()));
    };

    // Initial sync
    syncServerTime();

    // Live clock: update displayed time and window status every second
    const secondTimer = setInterval(() => {
      const adjustedNow = new Date(Date.now() + timeOffsetRef.current);
      setLiveTime(formatTimeDisplay(adjustedNow.toISOString()));
      setWindowStatus(getAttendanceWindowStatus(adjustedNow));
    }, 1000);

    // Re-sync with server every 30 seconds
    const syncTimer = setInterval(syncServerTime, 30000);

    return () => {
      isSubscribed = false;
      clearInterval(secondTimer);
      clearInterval(syncTimer);
    };
  }, []);

  const isOpen = (mounted && windowStatus ? windowStatus.isOpen : false) || devTimeWindowBypass;
  const isBefore = mounted && windowStatus ? windowStatus.isBeforeWindow : false;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-xl border ${
              isOpen
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                : isBefore
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {isOpen ? (
              <CheckCircle2 className="w-6 h-6 animate-pulse" />
            ) : isBefore ? (
              <Clock className="w-6 h-6" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white">Daily Attendance Window</h4>
              <span
                className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                  isOpen
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                6:00 PM – 10:00 PM
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {mounted && windowStatus ? windowStatus.statusMessage : 'Checking attendance window...'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Server Time:{' '}
              <span className="font-mono text-slate-200" suppressHydrationWarning>
                {mounted ? liveTime || windowStatus?.currentServerTime || '' : '--:--:-- --'}
              </span>
              {mounted && windowStatus?.timeRemainingText && ` • ${windowStatus.timeRemainingText}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all select-none">
            <input
              type="checkbox"
              checked={devTimeWindowBypass}
              onChange={(e) => setDevTimeWindowBypass(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-brand-500 bg-slate-900 border-slate-700"
            />
            <span className="text-[11px] font-medium text-slate-300">Test Override (24/7)</span>
          </label>
        </div>
      </div>
    </div>
  );
};
