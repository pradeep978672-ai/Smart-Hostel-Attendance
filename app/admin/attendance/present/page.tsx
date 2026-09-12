'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllStudentsWithAttendance } from '@/services/attendanceService';
import { getAllStudents } from '@/services/studentService';
import { AttendanceRecord, Student } from '@/types/database';
import { AttendanceTable } from '@/components/admin/AttendanceTable';
import { StudentAttendanceHistoryModal } from '@/components/admin/StudentAttendanceHistoryModal';
import { SearchBar } from '@/components/ui/SearchBar';
import { getFormattedTodayDate, formatDateDisplay } from '@/lib/time';
import {
  CheckCircle2,
  RefreshCw,
  Calendar,
  Building2,
  Users,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';

export default function PresentStudentsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getFormattedTodayDate());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [selectedHistoryStudent, setSelectedHistoryStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchPresent = useCallback(async (dateToLoad: string = selectedDate) => {
    setIsLoading(true);
    try {
      const [recs, students] = await Promise.all([
        getAllStudentsWithAttendance(dateToLoad),
        getAllStudents(),
      ]);
      setRecords(recs);
      setAllStudents(students);
    } catch (e) {
      console.error('Error fetching present students:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchPresent(selectedDate);
  }, [selectedDate, fetchPresent]);

  // Helper to reliably extract department for each record
  const getRecordDepartment = useCallback(
    (rec: AttendanceRecord): string => {
      const fromRec = rec.student?.department || (rec as any).department;
      if (fromRec && fromRec.trim()) return fromRec.trim();

      const matchedStudent = allStudents.find(
        (s) =>
          (rec.roll_number && s.roll_number?.toUpperCase() === rec.roll_number.toUpperCase()) ||
          (rec.student_id && s.id === rec.student_id)
      );
      return matchedStudent?.department?.trim() || 'General';
    },
    [allStudents]
  );

  // Filter present records based on search query
  const filteredRecords = useMemo(() => {
    const presentOnly = records.filter((r) => r.status === 'PRESENT');
    if (!searchQuery.trim()) return presentOnly;
    const q = searchQuery.trim().toLowerCase();
    return presentOnly.filter((rec) => {
      const name = (rec.student?.name || (rec as any).name || '').toLowerCase();
      const roll = (rec.roll_number || '').toLowerCase();
      const dept = getRecordDepartment(rec).toLowerCase();
      const room = (rec.student?.room_number || (rec as any).room_number || '').toLowerCase();
      return name.includes(q) || roll.includes(q) || dept.includes(q) || room.includes(q);
    });
  }, [records, searchQuery, getRecordDepartment]);

  // Group filtered present records by Department
  const departmentGroups = useMemo(() => {
    const groups: { [deptName: string]: AttendanceRecord[] } = {};

    filteredRecords.forEach((rec) => {
      const dept = getRecordDepartment(rec);
      if (!groups[dept]) {
        groups[dept] = [];
      }
      groups[dept].push(rec);
    });

    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((deptName) => ({
        department: deptName,
        students: groups[deptName],
      }));
  }, [filteredRecords, getRecordDepartment]);

  // Toggle single department expansion
  const toggleDept = (deptName: string) => {
    setExpandedDepts((prev) => ({
      ...prev,
      [deptName]: !prev[deptName],
    }));
  };

  // Toggle all departments expand / collapse
  const areAllExpanded = useMemo(() => {
    if (departmentGroups.length === 0) return false;
    return departmentGroups.every((g) => expandedDepts[g.department]);
  }, [departmentGroups, expandedDepts]);

  const toggleAllDepts = () => {
    if (areAllExpanded) {
      setExpandedDepts({});
    } else {
      const all: Record<string, boolean> = {};
      departmentGroups.forEach((g) => {
        all[g.department] = true;
      });
      setExpandedDepts(all);
    }
  };

  const totalPresentCount = records.filter((r) => r.status === 'PRESENT').length;
  const isToday = selectedDate === getFormattedTodayDate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" /> Present Students Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Department-wise collapsible directory of students who successfully submitted attendance for {formatDateDisplay(selectedDate)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                }
              }}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            />
            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(getFormattedTodayDate())}
                className="text-[10px] text-brand-400 hover:text-brand-300 font-bold ml-1 underline underline-offset-2"
              >
                Today
              </button>
            )}
          </div>

          <button
            onClick={() => fetchPresent(selectedDate)}
            disabled={isLoading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Bar & Summary Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/90 p-4 border border-slate-800 rounded-2xl">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search present students by Name, Roll Number, Department, or Room..."
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-800">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-300">
              Total Present: <strong className="text-emerald-400 font-bold">{filteredRecords.length}</strong>
              {searchQuery.trim() && (
                <span className="text-slate-500 font-normal"> (of {totalPresentCount})</span>
              )}
            </span>
          </div>

          {departmentGroups.length > 0 && (
            <button
              type="button"
              onClick={toggleAllDepts}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>{areAllExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Department-Wise Collapsible / Expandable Sections */}
      {departmentGroups.length === 0 ? (
        <div className="w-full p-8 text-center bg-slate-900/80 rounded-2xl border border-slate-800 text-slate-400 text-xs italic">
          No present students found matching current criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {departmentGroups.map((group) => {
            const isExpanded = Boolean(expandedDepts[group.department]);

            return (
              <div
                key={group.department}
                className="bg-slate-900/70 rounded-2xl border border-slate-800/90 overflow-hidden transition-all shadow-sm"
              >
                {/* Clickable Department Header */}
                <button
                  type="button"
                  onClick={() => toggleDept(group.department)}
                  className="w-full flex items-center justify-between p-4 bg-slate-900/90 hover:bg-slate-800/80 transition-colors text-left cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-wide">
                        {group.department}
                      </h2>
                      <span className="text-[11px] text-slate-400">
                        {isExpanded ? 'Click to collapse student list' : 'Click to view present students'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {group.students.length} {group.students.length === 1 ? 'Student Present' : 'Students Present'}
                    </span>
                    <div
                      className={`p-1.5 rounded-lg bg-slate-800 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-emerald-400' : ''
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </button>

                {/* Collapsible Student List Table */}
                {isExpanded && (
                  <div className="p-4 pt-2 border-t border-slate-800/60 bg-slate-950/40">
                    <AttendanceTable
                      records={group.students}
                      allStudents={allStudents}
                      mode="present"
                      onSelectStudentHistory={(s) => setSelectedHistoryStudent(s)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Student Attendance History Modal */}
      {selectedHistoryStudent && (
        <StudentAttendanceHistoryModal
          isOpen={Boolean(selectedHistoryStudent)}
          student={selectedHistoryStudent}
          allStudents={allStudents}
          onClose={() => setSelectedHistoryStudent(null)}
          onSelectStudent={(s) => setSelectedHistoryStudent(s)}
        />
      )}
    </div>
  );
}
