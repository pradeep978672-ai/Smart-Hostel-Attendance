'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  History,
  Shield,
  GraduationCap,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { role } = useAuth();

  const adminLinks = [
    { label: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Student List', href: '/admin/students', icon: Users },
    { label: 'Add Student', href: '/admin/students/add', icon: UserPlus },
    { label: 'Student Strength', href: '/admin/students/strength', icon: BarChart3 },
    { label: 'Present Students', href: '/admin/attendance/present', icon: CheckCircle },
    { label: 'Absent Students', href: '/admin/attendance/absent', icon: XCircle },
  ];

  const studentLinks = [
    { label: 'Student Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Submit Attendance', href: '/student/submit', icon: Clock },
    { label: 'My Attendance History', href: '/student/history', icon: History },
  ];

  const links = role === 'ADMIN' ? adminLinks : studentLinks;

  return (
    <aside className="w-full lg:w-64 shrink-0 bg-slate-950/60 border-r border-slate-800/80 p-4 min-h-[calc(100vh-61px)]">
      <div className="mb-4 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2">
        {role === 'ADMIN' ? (
          <>
            <Shield className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200">Admin Control Panel</span>
          </>
        ) : (
          <>
            <GraduationCap className="w-4 h-4 text-brand-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200">Student Portal</span>
          </>
        )}
      </div>

      <nav className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-md shadow-brand-900/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-500'}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Role Toggle Bar */}
      <div className="mt-8 pt-4 border-t border-slate-800/80 px-2">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Switch View Portal</p>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <Link
            href="/admin/dashboard"
            className={`py-1.5 text-center text-[11px] font-bold rounded-lg transition-colors ${
              role === 'ADMIN' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Admin
          </Link>
          <Link
            href="/student/dashboard"
            className={`py-1.5 text-center text-[11px] font-bold rounded-lg transition-colors ${
              role === 'STUDENT' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Student
          </Link>
        </div>
      </div>
    </aside>
  );
};
