'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createStudent } from '@/services/studentService';
import { StudentFormModal } from '@/components/student/StudentFormModal';
import { useToast } from '@/context/ToastContext';
import { UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AddStudentPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const handleCreate = async (payload: any) => {
    try {
      await createStudent(payload);
      showToast('success', 'Student Successfully Registered!', `Added ${payload.name} (${payload.roll_number})`);
      router.push('/admin/students');
    } catch (err: any) {
      showToast('error', 'Registration Failed', err.message || 'Unable to save student.');
      throw err;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Student Directory
      </Link>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Add New Hostel Student</h1>
            <p className="text-xs text-slate-400">Register student details, room allocation, and authentication methods</p>
          </div>
        </div>

        {/* Embedded Form Render */}
        <StudentFormModal
          isOpen={true}
          onClose={() => router.push('/admin/students')}
          onSubmit={handleCreate}
          title="Register Student"
        />
      </div>
    </div>
  );
}
