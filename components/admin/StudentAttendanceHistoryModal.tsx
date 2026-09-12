'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Student, AttendanceRecord } from '@/types/database';
import { getStudentAttendanceHistory } from '@/services/attendanceService';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { formatDateDisplay, formatTimeDisplay } from '@/lib/time';
import {
  History,
  Percent,
  CheckCircle2,
  XCircle,
  MapPin,
  Fingerprint,
  Key,
  RefreshCw,
  ExternalLink,
  Users,
  Search,
  AlertTriangle,
  Building2,
  DoorClosed,
  Image as ImageIcon,
} from 'lucide-react';

interface StudentAttendanceHistoryModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  allStudents?: Student[];
  onSelectStudent?: (student: Student) => void;
}

export const StudentAttendanceHistoryModal: React.FC<StudentAttendanceHistoryModalProps> = ({
  isOpen,
  student,
  onClose,
  allStudents = [],
  onSelectStudent,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(student);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [attendancePercentage, setAttendancePercentage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSelfie, setSelectedSelfie] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Keep local selected student synced with prop
  useEffect(() => {
    setSelectedStudent(student);
  }, [student]);

  const fetchHistory = useCallback(async () => {
    if (!selectedStudent) return;
    setIsLoading(true);
    try {
      const res = await getStudentAttendanceHistory(
        selectedStudent.id,
        selectedStudent.roll_number
      );
      setRecords(res.records);
      setAttendancePercentage(res.attendancePercentage);
    } catch (err) {
      console.error('Failed to load student attendance history:', err);
      setRecords([]);
      setAttendancePercentage(0);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (isOpen && selectedStudent) {
      fetchHistory();
    }
  }, [isOpen, selectedStudent, fetchHistory]);

  if (!isOpen) return null;

  const handleStudentSwitch = (newStudentId: string) => {
    const found = allStudents.find((s) => s.id === newStudentId);
    if (found) {
      setSelectedStudent(found);
      if (onSelectStudent) onSelectStudent(found);
    }
  };

  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Attendance History"
      maxWidth="xl"
    >
      <div className="space-y-5 text-xs">
        {/* Student Switcher Bar (if allStudents provided) */}
        {allStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="w-4 h-4 text-brand-400 shrink-0" />
              <span className="font-semibold text-slate-300">Select Student:</span>
            </div>
            <div className="flex items-center gap-2 flex-1 sm:max-w-md">
              <select
                value={selectedStudent?.id || ''}
                onChange={(e) => handleStudentSwitch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer"
              >
                {allStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.roll_number}) — {s.department}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={fetchHistory}
                disabled={isLoading}
                title="Refresh attendance logs"
                className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 transition-colors shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Student Profile Header */}
        {selectedStudent ? (
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <img
                src={
                  selectedStudent.profile_photo ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.name)}&background=0c8de9&color=fff`
                }
                alt={selectedStudent.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-brand-500/40 shadow-md shrink-0"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <h3 className="font-bold text-slate-100 text-base">{selectedStudent.name}</h3>
                  {selectedStudent.has_webauthn && (
                    <Badge variant="webauthn">
                      <Fingerprint className="w-3 h-3" /> Passkey Registered
                    </Badge>
                  )}
                </div>
                <p className="font-mono text-xs font-semibold text-brand-400 mt-0.5">
                  Roll: {selectedStudent.roll_number}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" /> {selectedStudent.department}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <DoorClosed className="w-3.5 h-3.5 text-slate-500" /> Room {selectedStudent.room_number}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {selectedStudent.current_location || 'Hostel'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 font-semibold text-[11px]">
                {records.length} Total Logs
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 bg-slate-950 rounded-2xl border border-slate-800">
            Please select a student to view their attendance history.
          </div>
        )}

        {/* Metric Summary Cards */}
        {selectedStudent && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              title="Attendance Score"
              value={`${attendancePercentage}%`}
              subtitle="30-Day Rate"
              icon={<Percent className="w-4 h-4" />}
              color={attendancePercentage >= 75 ? 'green' : 'amber'}
            />
            <StatCard
              title="Present Count"
              value={presentCount}
              subtitle="Verified Submissions"
              icon={<CheckCircle2 className="w-4 h-4" />}
              color="green"
            />
            <StatCard
              title="Absent / Unmarked"
              value={absentCount}
              subtitle="Missed Sessions"
              icon={<XCircle className="w-4 h-4" />}
              color="red"
            />
          </div>
        )}

        {/* History Records Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 shadow-lg">
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-brand-400" />
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                Historical Logs from Supabase
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Live Database Records
            </span>
          </div>

          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submission Time</th>
                  <th className="px-4 py-3">Submitted Location</th>
                  <th className="px-4 py-3">Auth Method</th>
                  <th className="px-4 py-3 text-right">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      <LoaderSpinnerText text="Loading attendance history..." />
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500 italic">
                      No attendance records found for this student in Supabase.
                    </td>
                  </tr>
                ) : (
                  records.map((rec, idx) => {
                    const isPresent = rec.status === 'PRESENT';
                    const isAbsent = rec.status === 'ABSENT';
                    const hasCoords =
                      rec.location_lat != null &&
                      rec.location_lng != null &&
                      (rec.location_lat !== 0 || rec.location_lng !== 0);

                    return (
                      <tr
                        key={rec.id || `hist-${idx}`}
                        className="hover:bg-slate-900/60 transition-colors"
                      >
                        {/* Date */}
                        <td className="px-4 py-3 font-semibold text-slate-100 whitespace-nowrap">
                          {formatDateDisplay(rec.attendance_date || rec.date)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isPresent ? (
                            <Badge variant="present">PRESENT</Badge>
                          ) : isAbsent ? (
                            <Badge variant="absent">ABSENT</Badge>
                          ) : (
                            <Badge variant="not_submitted">NOT SUBMITTED</Badge>
                          )}
                        </td>

                        {/* Submission Time */}
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          {rec.submission_time ? (
                            <span className="font-mono text-slate-200">
                              {formatTimeDisplay(rec.submission_time)}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Submitted Location */}
                        <td className="px-4 py-3">
                          {hasCoords ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="flex items-center gap-1 font-mono text-[11px] text-slate-200">
                                <MapPin className="w-3 h-3 text-brand-400 shrink-0" />
                                {rec.location_lat?.toFixed(4)}, {rec.location_lng?.toFixed(4)}
                              </span>
                              {rec.location_address && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                  {rec.location_address}
                                </span>
                              )}
                              <a
                                href={`https://www.openstreetmap.org/?mlat=${rec.location_lat}&mlon=${rec.location_lng}#map=16/${rec.location_lat}/${rec.location_lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-brand-400 hover:underline mt-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> View on Map
                              </a>
                            </div>
                          ) : rec.location_address ? (
                            <span className="flex items-center gap-1 text-slate-300">
                              <MapPin className="w-3 h-3 text-brand-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{rec.location_address}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Auth Method */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {rec.auth_method === 'WEBAUTHN_PASSKEY' ? (
                            <Badge variant="webauthn">
                              <Fingerprint className="w-3 h-3" /> Passkey
                            </Badge>
                          ) : isPresent || isAbsent ? (
                            <Badge variant="neutral">
                              <Key className="w-3 h-3 text-slate-400" /> Password
                            </Badge>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Selfie / Proof */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {rec.selfie_photo || rec.selfie_url ? (
                            <button
                              type="button"
                              onClick={() => setSelectedSelfie(rec.selfie_photo || rec.selfie_url || null)}
                              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors inline-flex items-center gap-1"
                              title="View captured selfie"
                            >
                              <img
                                src={rec.selfie_photo || rec.selfie_url || ''}
                                alt="Selfie"
                                className="w-6 h-6 rounded object-cover"
                              />
                            </button>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selfie Lightbox Modal */}
        {selectedSelfie && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
            onClick={() => setSelectedSelfie(null)}
          >
            <div
              className="relative max-w-sm w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-400" /> Attendance Selfie Snapshot
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSelfie(null)}
                  className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded-lg bg-slate-800"
                >
                  Close
                </button>
              </div>
              <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                <img
                  src={selectedSelfie}
                  alt="Captured Selfie"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer info & close button */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-slate-400 text-[11px]">
          <span>
            Queried directly from Supabase <code className="text-slate-300 font-mono">attendance</code> table
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

function LoaderSpinnerText({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <RefreshCw className="w-4 h-4 text-brand-400 animate-spin" />
      <span>{text}</span>
    </div>
  );
}
