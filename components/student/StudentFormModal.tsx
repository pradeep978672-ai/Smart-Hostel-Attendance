'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Student } from '@/types/database';
import { CreateStudentPayload } from '@/services/studentService';
import { isWebAuthnSupported, registerWebAuthnPasskey } from '@/lib/webauthn';
import { Fingerprint, Loader2, User, Key, Building2, DoorClosed, MapPin, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateStudentPayload) => Promise<void>;
  initialData?: Student | null;
  title?: string;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title = 'Add New Student',
}) => {
  const { showToast } = useToast();
  const [rollNumber, setRollNumber] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [roomNumber, setRoomNumber] = useState('');
  const [currentLocation, setCurrentLocation] = useState('Hostel Block A');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [password, setPassword] = useState('Student@123');
  const [enableWebAuthn, setEnableWebAuthn] = useState(true);
  const [webauthnCredId, setWebauthnCredId] = useState('');
  const [webauthnPubKey, setWebauthnPubKey] = useState('');
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialData) {
      setRollNumber(initialData.roll_number);
      setName(initialData.name);
      setDepartment(initialData.department);
      setRoomNumber(initialData.room_number);
      setCurrentLocation(initialData.current_location || 'Hostel Block A');
      setProfilePhoto(initialData.profile_photo || '');
      setEnableWebAuthn(initialData.has_webauthn);
    } else {
      setRollNumber('');
      setName('');
      setDepartment('Computer Science');
      setRoomNumber('');
      setCurrentLocation('Hostel Block A');
      setProfilePhoto('');
      setPassword('Student@123');
      setEnableWebAuthn(true);
    }
    setErrorMsg('');
  }, [initialData, isOpen]);

  const handleRegisterPasskey = async () => {
    if (!name || !rollNumber) {
      setErrorMsg('Please enter Roll Number and Name first before registering Passkey.');
      return;
    }
    setIsRegisteringPasskey(true);
    setErrorMsg('');
    try {
      const res = await registerWebAuthnPasskey(rollNumber, name);
      setWebauthnCredId(res.credentialId);
      setWebauthnPubKey(res.publicKey);
      setEnableWebAuthn(true);
      showToast('success', 'Biometric Passkey Configured!', 'Passkey linked safely to student device.');
    } catch (err: any) {
      showToast('info', 'Passkey Registration Notice', err.message || 'Passkey setup cancelled or fallback enabled.');
      setEnableWebAuthn(true);
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim() || !name.trim() || !roomNumber.trim()) {
      setErrorMsg('Please complete all required fields (Roll No, Name, Room No).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onSubmit({
        roll_number: rollNumber,
        name,
        department,
        room_number: roomNumber,
        current_location: currentLocation,
        profile_photo: profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0c8de9&color=fff`,
        password,
        enable_webauthn: enableWebAuthn,
        webauthn_credential_id: webauthnCredId,
        webauthn_public_key: webauthnPubKey,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save student record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Student Details' : title} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 font-medium">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-400" /> Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-brand-400" /> Roll Number *
            </label>
            <input
              type="text"
              required
              disabled={Boolean(initialData)}
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
              placeholder="e.g. 2024-CS-001"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-brand-400" /> Department *
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="Computer Science">Computer Science</option>
              <option value="Electronic Communication Engineering">Electronic Communication Engineering</option>
              <option value="Cyber Security">Cyber Security</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
              <option value="Information Technology">Information Technology</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <DoorClosed className="w-3.5 h-3.5 text-brand-400" /> Room Number *
            </label>
            <input
              type="text"
              required
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. A-201"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-400" /> Default Hostel Location
            </label>
            <input
              type="text"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="Hostel Block A, Floor 2"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-brand-400" /> Profile Photo URL (Optional)
            </label>
            <input
              type="url"
              value={profilePhoto}
              onChange={(e) => setProfilePhoto(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
        </div>

        {!initialData && (
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Set Account Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
        )}

        <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Fingerprint className="w-5 h-5 text-purple-400" />
            <div>
              <p className="font-semibold text-slate-200">WebAuthn / Biometric Passkey</p>
              <p className="text-[11px] text-slate-400">Allows fast device passkey login (Touch ID / Face ID)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRegisterPasskey}
            disabled={isRegisteringPasskey}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-[11px] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isRegisteringPasskey && <Loader2 className="w-3 h-3 animate-spin" />}
            Register Passkey
          </button>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-900/30 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {initialData ? 'Update Record' : 'Save Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
