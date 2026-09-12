'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Shield, Lock, Mail, Loader2, Building, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const { loginAsAdmin } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('admin@hostel.edu');
  const [password, setPassword] = useState('AdminSecret#2026');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const ok = await loginAsAdmin(email, password);
      if (ok) {
        showToast('success', 'Admin Authentication Successful', 'Welcome back to Admin Control Panel.');
        router.push('/admin/dashboard');
      } else {
        showToast('error', 'Login Failed', 'Invalid admin credentials provided.');
      }
    } catch (err: any) {
      showToast('error', 'Login Error', err.message || 'Unable to authenticate as admin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      <Link
        href="/"
        className="absolute top-6 left-6 text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Admin Login</h2>
          <p className="text-xs text-slate-400 mt-1">Access Hostel Control Panel & Student Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-purple-400" /> Admin Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-400" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 disabled:opacity-50 mt-6"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log In to Admin Dashboard'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Student trying to mark attendance?{' '}
            <Link href="/login/student" className="text-brand-400 hover:underline font-semibold">
              Student Portal Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
