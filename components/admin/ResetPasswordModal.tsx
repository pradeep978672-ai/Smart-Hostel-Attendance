'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Student } from '@/types/database';
import { updateStudent } from '@/services/studentService';
import { useToast } from '@/context/ToastContext';
import { Key, Lock, Eye, EyeOff, Loader2, Sparkles, User, Building2, CheckCircle2 } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  student,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!student) return null;

  const handleGenerateRandom = () => {
    // Generate a strong, readable password (e.g. Host@8492)
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const generated = `Hostel@${randomDigits}`;
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword.trim()) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      // updateStudent securely hashes the password with SHA-256 before writing to Supabase
      await updateStudent(student.id, { password: newPassword });
      showToast(
        'success',
        'Password Reset Successfully',
        `Updated password for ${student.name} (${student.roll_number})`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Password reset failed:', err);
      setErrorMessage(err.message || 'Failed to update student password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset Student Password" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Student Info Card */}
        <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
          <img
            src={
              student.profile_photo ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}`
            }
            alt={student.name}
            className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-slate-100 text-sm truncate">{student.name}</h4>
            <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
              <span className="font-mono text-brand-400 font-semibold">{student.roll_number}</span>
              <span>•</span>
              <span className="truncate">{student.department}</span>
              <span>•</span>
              <span>Room {student.room_number}</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 font-medium">
            {errorMessage}
          </div>
        )}

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] leading-relaxed">
          <p className="font-semibold flex items-center gap-1 mb-0.5">
            <Key className="w-3.5 h-3.5 text-amber-400" /> Secure Admin Action
          </p>
          The new password will be cryptographically hashed (SHA-256) before saving. Plain-text passwords and hashes are never exposed.
        </div>

        {/* New Password Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-slate-300 font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-400" /> New Password *
            </label>
            <button
              type="button"
              onClick={handleGenerateRandom}
              className="text-[11px] text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3" /> Auto-generate
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 4 characters)"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password Input */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Confirm New Password *
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-type new password"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>

        {/* Actions */}
        <div className="pt-3 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-900/30 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Key className="w-4 h-4" /> Update Password
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
