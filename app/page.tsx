'use client';

import React from 'react';
import Link from 'next/link';
import { Building, Shield, GraduationCap, Clock, CheckCircle2, MapPin, Fingerprint, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 lg:p-12 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-xl shadow-brand-900/40">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-white">Smart Hostel System</h1>
            <p className="text-xs text-slate-400 font-medium">Supabase Biometric Attendance</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login/student"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition-colors"
          >
            Student Login
          </Link>
          <Link
            href="/login/admin"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-brand-900/30"
          >
            Admin Login
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto w-full my-auto py-12 z-10 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-6">
          <Clock className="w-4 h-4 text-brand-400" /> Daily Attendance Window: 6:00 PM – 10:00 PM
        </div>

        <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-3xl">
          Automated, Secure <span className="bg-gradient-to-r from-brand-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">Hostel Attendance</span> Management
        </h2>

        <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
          Full-stack biometric attendance system powered by Supabase, WebAuthn Passkeys, live camera selfie verification, and strict GPS location tracking.
        </p>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mt-10">
          <Link
            href="/student/dashboard"
            className="group relative p-8 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-brand-500/50 rounded-3xl text-left transition-all duration-300 hover:scale-[1.02] shadow-2xl flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-4 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-brand-300 transition-colors">
                Student Portal
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Submit today&apos;s attendance using registered selfie photo, live GPS location, and WebAuthn passkey authentication.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-brand-400 group-hover:translate-x-1 transition-transform">
              Enter Student Portal <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/admin/dashboard"
            className="group relative p-8 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-3xl text-left transition-all duration-300 hover:scale-[1.02] shadow-2xl flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                Admin Control Dashboard
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Manage student records, review present/absent counts, track department strength, and audit location verification proofs.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">
              Open Admin Dashboard <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Feature Pill Grid */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Server Time Verification
          </div>
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-purple-400" /> WebAuthn Passkeys
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-400" /> GPS Geolocation
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-slate-500 border-t border-slate-900 pt-6 z-10">
        Hostel Attendance Management System • Built with Next.js, Supabase & Tailwind CSS
      </footer>
    </div>
  );
}
