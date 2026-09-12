import React from 'react';
import { Student } from '@/types/database';
import { Badge } from '../ui/Badge';
import { Building2, DoorClosed, MapPin, Edit3, Trash2, Fingerprint, Key, History } from 'lucide-react';

interface StudentCardProps {
  student: Student;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
  onResetPassword?: (student: Student) => void;
  onViewHistory?: (student: Student) => void;
  showActions?: boolean;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onEdit,
  onDelete,
  onResetPassword,
  onViewHistory,
  showActions = true,
}) => {
  return (
    <div className="relative overflow-hidden bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:translate-y-[-2px] flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <img
              src={student.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}`}
              alt={student.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-brand-500/40 shadow-md"
            />
            <div>
              <h3 className="font-bold text-slate-100 text-base group-hover:text-brand-300 transition-colors">
                {student.name}
              </h3>
              <p className="text-xs font-mono font-semibold text-brand-400">{student.roll_number}</p>
            </div>
          </div>
          {student.has_webauthn && (
            <Badge variant="webauthn" className="shrink-0">
              <Fingerprint className="w-3 h-3" /> Passkey Active
            </Badge>
          )}
        </div>

        <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> Dept:
            </span>
            <span className="font-medium text-slate-200">{student.department}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <DoorClosed className="w-3.5 h-3.5 text-slate-400" /> Room:
            </span>
            <span className="font-medium text-slate-200">{student.room_number}</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location:
            </span>
            <span className="font-medium text-slate-300 truncate max-w-[140px]" title={student.current_location}>
              {student.current_location || 'Hostel'}
            </span>
          </div>
        </div>
      </div>

      {showActions && (onEdit || onDelete || onResetPassword || onViewHistory) && (
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-end gap-1.5">
          {onViewHistory && (
            <button
              type="button"
              onClick={() => onViewHistory(student)}
              className="px-2.5 py-1.5 bg-brand-600/15 hover:bg-brand-600/25 text-brand-300 hover:text-brand-200 border border-brand-500/30 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
              title="View complete attendance history"
            >
              <History className="w-3.5 h-3.5 text-brand-400" /> History
            </button>
          )}
          {onResetPassword && (
            <button
              type="button"
              onClick={() => onResetPassword(student)}
              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
              title="Reset student password"
            >
              <Key className="w-3.5 h-3.5" /> Reset Pass
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(student)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(student)}
              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};
