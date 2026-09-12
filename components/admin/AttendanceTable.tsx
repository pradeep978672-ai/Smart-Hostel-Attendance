'use client';

import React, { useState } from 'react';
import { AttendanceRecord, Student } from '@/types/database';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { formatTimeDisplay, formatDateDisplay } from '@/lib/time';
import { MapPin, Eye, Fingerprint, Key, ShieldCheck, ExternalLink, AlertTriangle, CheckCircle2, History } from 'lucide-react';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  allStudents?: Student[];
  mode?: 'all' | 'present' | 'absent';
  onSelectStudentHistory?: (student: Student) => void;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  allStudents = [],
  mode = 'all',
  onSelectStudentHistory,
}) => {
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  let displayList: AttendanceRecord[] = [];

  if (mode === 'present') {
    displayList = records.filter((r) => r.status === 'PRESENT');
  } else if (mode === 'absent') {
    displayList = records.filter((r) => r.status === 'ABSENT' || r.status === 'NOT_SUBMITTED');
  } else {
    displayList = records;
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-800">
            <tr>
              <th className="px-5 py-4">Student Name</th>
              <th className="px-5 py-4">Roll Number</th>
              <th className="px-5 py-4">Department & Room</th>
              <th className="px-5 py-4">Time / Date</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">Auth Method</th>
              <th className="px-5 py-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {displayList.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-slate-500 italic">
                  No records found matching current criteria.
                </td>
              </tr>
            ) : (
              displayList.map((item, idx) => {
                const isPresent = item.status === 'PRESENT';
                const isAbsent = item.status === 'ABSENT';
                const isNotSubmitted = item.status === 'NOT_SUBMITTED' || (!isPresent && !isAbsent);
                const studentData =
                  item.student ||
                  allStudents.find(
                    (s) =>
                      (item.roll_number && s.roll_number?.toUpperCase() === item.roll_number?.toUpperCase()) ||
                      (item.student_id && s.id === item.student_id)
                  );
                const studentDept = studentData?.department || item.student?.department || (item as any).department || 'General';
                const studentRoom = studentData?.room_number || item.student?.room_number || (item as any).room_number || 'N/A';
                const hasLocation = item.location_lat != null && item.location_lng != null;
                const needsReview = item.location_review_status === 'NEEDS_REVIEW';

                return (
                  <tr key={item.id || `record-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-100">
                      {studentData && onSelectStudentHistory ? (
                        <button
                          type="button"
                          onClick={() => onSelectStudentHistory(studentData)}
                          className="flex items-center gap-3 text-left group/name hover:text-brand-300 transition-colors cursor-pointer"
                          title="Click to view complete attendance history"
                        >
                          <img
                            src={
                              studentData?.profile_photo ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(studentData?.name || item.student?.name || 'User')}`
                            }
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0 group-hover/name:border-brand-500 transition-colors"
                          />
                          <span className="group-hover/name:underline underline-offset-2">
                            {studentData?.name || item.student?.name || 'N/A'}
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              studentData?.profile_photo ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(studentData?.name || item.student?.name || 'User')}`
                            }
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                          <span>{studentData?.name || item.student?.name || 'N/A'}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-brand-400 font-semibold">
                      {item.roll_number || studentData?.roll_number}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-slate-200">{studentDept}</span>
                      <span className="text-slate-500 block text-[11px]">Room {studentRoom}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {isPresent && item.submission_time ? (
                        <>
                          <span className="font-semibold text-slate-200">{formatTimeDisplay(item.submission_time)}</span>
                          <span className="text-slate-500 block text-[11px]">{formatDateDisplay(item.attendance_date || item.date)}</span>
                        </>
                      ) : isAbsent && item.submission_time ? (
                        <>
                          <span className="font-semibold text-slate-200">{formatTimeDisplay(item.submission_time)}</span>
                          <span className="text-slate-500 block text-[11px]">{formatDateDisplay(item.attendance_date || item.date)}</span>
                        </>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {isPresent ? (
                        <Badge variant="present">PRESENT</Badge>
                      ) : isAbsent ? (
                        <Badge variant="absent">ABSENT</Badge>
                      ) : (
                        <Badge variant="not_submitted">NOT SUBMITTED</Badge>
                      )}
                    </td>
                    {/* Location column */}
                    <td className="px-5 py-3.5">
                      {!hasLocation || isNotSubmitted ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[11px] text-slate-300">
                            {item.location_lat?.toFixed(4)}, {item.location_lng?.toFixed(4)}
                          </span>
                          {item.location_accuracy != null && (
                            <span className="text-[10px] text-slate-500">
                              ±{Math.round(item.location_accuracy)}m
                            </span>
                          )}
                          {needsReview && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-semibold">
                              <AlertTriangle className="w-2.5 h-2.5" /> Needs Review
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {isNotSubmitted ? (
                        <span className="text-slate-500">—</span>
                      ) : item.auth_method === 'WEBAUTHN_PASSKEY' ? (
                        <Badge variant="webauthn">
                          <Fingerprint className="w-3 h-3" /> WebAuthn Passkey
                        </Badge>
                      ) : isPresent || isAbsent ? (
                        <Badge variant="neutral">
                          <Key className="w-3 h-3 text-slate-400" /> Password
                        </Badge>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onSelectStudentHistory && studentData && (
                          <button
                            type="button"
                            onClick={() => onSelectStudentHistory(studentData)}
                            className="px-2.5 py-1 bg-brand-600/15 hover:bg-brand-600/25 text-brand-300 hover:text-brand-200 rounded-lg text-xs font-semibold border border-brand-500/30 flex items-center gap-1 transition-colors"
                            title="View complete attendance history"
                          >
                            <History className="w-3.5 h-3.5 text-brand-400" /> History
                          </button>
                        )}
                        {isPresent || (Boolean(item.id && !item.id.startsWith('unsubmitted-')) && Boolean(item.selfie_photo || item.location_lat != null)) ? (
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(item)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1 transition-colors"
                            title="View submission selfie and location proof"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        ) : (
                          !onSelectStudentHistory && <span className="text-slate-600 block pr-2">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Record Proof Detail Modal */}
      {selectedRecord && (
        <Modal
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          title="Attendance Verification Record"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {/* Student info */}
            {(() => {
              const studentInfo =
                selectedRecord.student ||
                allStudents.find(
                  (s) =>
                    (selectedRecord.roll_number && s.roll_number?.toUpperCase() === selectedRecord.roll_number?.toUpperCase()) ||
                    (selectedRecord.student_id && s.id === selectedRecord.student_id)
                );
              const studentDept = studentInfo?.department || selectedRecord.student?.department || (selectedRecord as any).department || 'General';
              const studentRoom = studentInfo?.room_number || selectedRecord.student?.room_number || (selectedRecord as any).room_number || 'N/A';
              const studentName = studentInfo?.name || selectedRecord.student?.name || (selectedRecord as any).name || selectedRecord.roll_number;

              return (
                <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <img
                    src={
                      studentInfo?.profile_photo ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}`
                    }
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                  />
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">
                      {studentName}
                    </h4>
                    <p className="font-mono text-brand-400 font-semibold">{selectedRecord.roll_number}</p>
                    <p className="text-[11px] text-slate-400">
                      {studentDept} • Room {studentRoom}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Selfie photo */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Captured Selfie Photo</label>
              <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {selectedRecord.selfie_photo ? (
                  <img
                    src={selectedRecord.selfie_photo}
                    alt="Selfie verification"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-slate-500">No photo captured</span>
                )}
                <div className="absolute bottom-2 right-2 bg-emerald-500/90 text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3 h-3" /> Live Verified
                </div>
              </div>
            </div>

            {/* Location section */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand-400" /> Submission Location
                </span>
                {selectedRecord.location_review_status === 'NEEDS_REVIEW' ? (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" /> Needs Review
                  </span>
                ) : selectedRecord.location_lat != null ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                ) : null}
              </div>

              {selectedRecord.location_lat != null && selectedRecord.location_lng != null ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-900 rounded-lg p-2">
                      <p className="text-slate-500 mb-0.5">Latitude</p>
                      <p className="font-mono text-slate-200">{selectedRecord.location_lat.toFixed(6)}</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-2">
                      <p className="text-slate-500 mb-0.5">Longitude</p>
                      <p className="font-mono text-slate-200">{selectedRecord.location_lng.toFixed(6)}</p>
                    </div>
                    {selectedRecord.location_accuracy != null && (
                      <div className="bg-slate-900 rounded-lg p-2">
                        <p className="text-slate-500 mb-0.5">GPS Accuracy</p>
                        <p className="font-mono text-slate-200">±{Math.round(selectedRecord.location_accuracy)} m</p>
                      </div>
                    )}
                    {selectedRecord.location_captured_at && (
                      <div className="bg-slate-900 rounded-lg p-2">
                        <p className="text-slate-500 mb-0.5">Captured At</p>
                        <p className="font-mono text-slate-200">
                          {formatTimeDisplay(selectedRecord.location_captured_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedRecord.location_address && (
                    <p className="text-[11px] text-slate-400 pl-0.5">{selectedRecord.location_address}</p>
                  )}

                  {/* View on map */}
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${selectedRecord.location_lat}&mlon=${selectedRecord.location_lng}#map=16/${selectedRecord.location_lat}/${selectedRecord.location_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/40 text-brand-300 rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> View on OpenStreetMap
                  </a>

                  <p className="text-[10px] text-slate-500 italic">
                    📌 This is the location captured at the time of attendance submission — not live tracking.
                    Browser GPS cannot guarantee 100% spoofing prevention.
                  </p>

                  {selectedRecord.location_review_status === 'NEEDS_REVIEW' && (
                    <p className="text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                      ⚠ GPS accuracy is low (±{Math.round(selectedRecord.location_accuracy ?? 999)}m), which may indicate a mock/simulated location signal. Manual review recommended.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">No location data recorded.</p>
              )}
            </div>

            {/* Submission metadata */}
            <div className="flex justify-between items-center pt-2 text-[11px] text-slate-400 border-t border-slate-800">
              <span>Submitted: {formatTimeDisplay(selectedRecord.submission_time)} · {formatDateDisplay(selectedRecord.attendance_date || selectedRecord.date)}</span>
              <Badge variant={selectedRecord.auth_method === 'WEBAUTHN_PASSKEY' ? 'webauthn' : 'neutral'}>
                {selectedRecord.auth_method}
              </Badge>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
