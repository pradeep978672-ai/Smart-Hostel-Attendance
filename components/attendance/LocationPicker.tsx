'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, CheckCircle2, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { getCurrentLocation, GeoLocationResult } from '@/lib/geolocation';

type LocationState = 'idle' | 'loading' | 'ready' | 'denied' | 'error';

interface LocationPickerProps {
  /** Called only when a real GPS fix is obtained. Never called with fake/fallback coords. */
  onLocationCaptured: (location: GeoLocationResult) => void;
  /** Called when location is unavailable — parent should block submission. */
  onLocationError: (reason: string) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationCaptured,
  onLocationError,
}) => {
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [location, setLocation] = useState<GeoLocationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchLocation = async () => {
    setLocationState('loading');
    setErrorMsg('');
    setLocation(null);

    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
      setLocationState('ready');
      onLocationCaptured(loc);
    } catch (err: any) {
      const msg: string = err?.message || 'Failed to get GPS location.';
      setErrorMsg(msg);
      // Distinguish permission denial from other errors
      setLocationState(msg.includes('denied') ? 'denied' : 'error');
      onLocationError(msg);
    }
  };

  // Auto-fetch once on mount so student knows GPS status before submitting
  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs uppercase tracking-wider">
          <MapPin className="w-4 h-4 text-brand-400" /> GPS Location Capture
        </div>
        {locationState !== 'loading' && (
          <button
            type="button"
            onClick={fetchLocation}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
          >
            <RefreshCw className="w-3 h-3" /> Retry GPS
          </button>
        )}
      </div>

      {locationState === 'loading' && (
        <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
          <Navigation className="w-4 h-4 animate-bounce text-brand-400" />
          Detecting your current GPS location…
        </div>
      )}

      {locationState === 'ready' && location && (
        <div className="flex items-start gap-2.5 p-3 bg-slate-900/90 rounded-xl border border-emerald-800/40 text-xs text-slate-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{location.address}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              &nbsp;· ±{Math.round(location.accuracy)}m accuracy
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5">
              ✓ Location will be captured fresh when you submit.
            </p>
          </div>
        </div>
      )}

      {locationState === 'denied' && (
        <div className="flex items-start gap-2.5 p-3 bg-rose-500/10 rounded-xl border border-rose-500/30 text-xs text-rose-300">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div>
            <p className="font-bold text-rose-200">Location Permission Denied</p>
            <p className="mt-0.5 text-rose-300/80">{errorMsg}</p>
            <p className="mt-1 text-[11px] text-rose-400">
              GPS location is mandatory. Attendance cannot be submitted without location access.
              Allow location in your browser settings and click Retry GPS.
            </p>
          </div>
        </div>
      )}

      {locationState === 'error' && (
        <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-200">GPS Unavailable</p>
            <p className="mt-0.5">{errorMsg}</p>
            <p className="mt-1 text-[11px] text-amber-400">
              Click Retry GPS or check your device's location settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
