'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Building, Shield, User, LogOut, Sparkles, Clock } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { role, currentStudent, adminUser, logout, devTimeWindowBypass } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand logo & title */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-900/30 group-hover:scale-105 transition-transform">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              Hostel Attendance <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Management System</p>
          </div>
        </Link>

        {/* Right side user status & actions */}
        <div className="flex items-center gap-3">
          {devTimeWindowBypass && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
              <Clock className="w-3.5 h-3.5" /> 24/7 Test Mode Active
            </div>
          )}

          {role === 'ADMIN' && adminUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <Shield className="w-4 h-4 text-purple-400" />
              <div className="hidden md:block text-xs text-left">
                <p className="font-semibold text-slate-100">{adminUser.name}</p>
                <p className="text-[10px] text-purple-400 font-bold uppercase">ADMIN ROLE</p>
              </div>
            </div>
          )}

          {role === 'STUDENT' && currentStudent && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <img
                src={currentStudent.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStudent.name)}`}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-brand-500"
              />
              <div className="hidden md:block text-xs text-left">
                <p className="font-semibold text-slate-100 truncate max-w-[120px]">{currentStudent.name}</p>
                <p className="text-[10px] text-brand-400 font-mono font-bold">{currentStudent.roll_number}</p>
              </div>
            </div>
          )}

          {role ? (
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login/student"
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
              >
                Student Login
              </Link>
              <Link
                href="/login/admin"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-colors shadow-md shadow-brand-900/20"
              >
                Admin Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
