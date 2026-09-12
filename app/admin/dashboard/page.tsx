'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAttendanceStats, getAllStudentsWithAttendance } from '@/services/attendanceService';
import { getAllStudents } from '@/services/studentService';
import { AttendanceRecord, AttendanceStats, Student } from '@/types/database';
import { StatCard } from '@/components/ui/StatCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { AttendanceTable } from '@/components/admin/AttendanceTable';
import { AttendanceWindowBadge } from '@/components/attendance/AttendanceWindowBadge';
import { StudentAttendanceHistoryModal } from '@/components/admin/StudentAttendanceHistoryModal';
import { Users, CheckCircle2, XCircle, Percent, RefreshCw, Calendar, History } from 'lucide-react';
import { getFormattedTodayDate, formatDateDisplay } from '@/lib/time';

export default function AdminDashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getFormattedTodayDate());
  const [stats, setStats] = useState<AttendanceStats>({
    totalStudents: 0,
    presentCount: 0,
    absentCount: 0,
    attendancePercentage: 0,
  });

  const [dailyRecords, setDailyRecords] = useState<AttendanceRecord[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'present' | 'absent' | 'all'>('present');
  const [selectedHistoryStudent, setSelectedHistoryStudent] = useState<Student | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadDashboardData = useCallback(async (dateToLoad: string = selectedDate) => {
    setIsLoading(true);
    try {
      const [currentStats, records, students] = await Promise.all([
        getAttendanceStats(dateToLoad),
        getAllStudentsWithAttendance(dateToLoad),
        getAllStudents(),
      ]);

      setStats(currentStats);
      setDailyRecords(records);
      setAllStudents(students);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadDashboardData(selectedDate);
  }, [selectedDate, loadDashboardData]);

  // Filter all daily records matching search query (Name, Roll Number, Department, Room Number)
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return dailyRecords;
    const q = searchQuery.trim().toLowerCase();
    return dailyRecords.filter((rec) => {
      const name = (rec.student?.name || (rec as any).name || '').toLowerCase();
      const roll = (rec.roll_number || '').toLowerCase();
      const dept = (rec.student?.department || (rec as any).department || '').toLowerCase();
      const room = (rec.student?.room_number || (rec as any).room_number || '').toLowerCase();
      return name.includes(q) || roll.includes(q) || dept.includes(q) || room.includes(q);
    });
  }, [dailyRecords, searchQuery]);

  const isToday = selectedDate === getFormattedTodayDate();

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Admin Attendance Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time daily attendance monitoring & verification analytics</p>
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
            type="button"
            onClick={() => {
              if (allStudents.length > 0 && !selectedHistoryStudent) {
                setSelectedHistoryStudent(allStudents[0]);
              }
              setIsHistoryModalOpen(true);
            }}
            className="px-3.5 py-2 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
            title="Select a student to view complete attendance history"
          >
            <History className="w-3.5 h-3.5 text-purple-400" /> Student Attendance History
          </button>

          <button
            onClick={() => loadDashboardData(selectedDate)}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Live Feeds
          </button>
        </div>
      </div>

      {/* Attendance Window Status */}
      <AttendanceWindowBadge />

      {/* Metric Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Students"
          value={stats.totalStudents}
          subtitle="Hostel Blocks A, B & C"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Present Count"
          value={stats.presentCount}
          subtitle={isToday ? 'Submitted Today' : `Verified on ${formatDateDisplay(selectedDate)}`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Absent Count"
          value={stats.absentCount}
          subtitle={isToday ? 'Pending / Unsubmitted' : `Unsubmitted on ${formatDateDisplay(selectedDate)}`}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title="Attendance Percentage"
          value={`${stats.attendancePercentage}%`}
          subtitle="Daily Hostel Turnout"
          icon={<Percent className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Search Bar & Separate Present / Absent Tab Navigation */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/80 p-4 border border-slate-800 rounded-2xl">
          {/* Multi-field Search Bar */}
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by Name, Roll Number, Department, or Room Number..."
            />
          </div>

          {/* List Switch Tabs */}
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('present')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'present'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Present List ({stats.presentCount})
            </button>
            <button
              onClick={() => setActiveTab('absent')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'absent'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" /> Absent List ({stats.absentCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'all'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Records ({stats.totalStudents})
            </button>
          </div>
        </div>

        {/* Tab View Render */}
        {activeTab === 'present' && (
          <div>
            <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />{' '}
              {isToday ? "Today's Verified Present Students List" : `Verified Present Students (${formatDateDisplay(selectedDate)})`}
            </h3>
            <AttendanceTable
              records={filteredRecords.filter((r) => r.status === 'PRESENT')}
              allStudents={allStudents}
              mode="present"
              onSelectStudentHistory={(s) => {
                setSelectedHistoryStudent(s);
                setIsHistoryModalOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'absent' && (
          <div>
            <h3 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4" />{' '}
              {isToday ? "Today's Unsubmitted / Absent Students List" : `Unsubmitted / Absent Students (${formatDateDisplay(selectedDate)})`}
            </h3>
            <AttendanceTable
              records={filteredRecords}
              allStudents={allStudents}
              mode="absent"
              onSelectStudentHistory={(s) => {
                setSelectedHistoryStudent(s);
                setIsHistoryModalOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'all' && (
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-3">
              All Hostel Attendance Activity ({formatDateDisplay(selectedDate)})
            </h3>
            <AttendanceTable
              records={filteredRecords}
              allStudents={allStudents}
              mode="all"
              onSelectStudentHistory={(s) => {
                setSelectedHistoryStudent(s);
                setIsHistoryModalOpen(true);
              }}
            />
          </div>
        )}
      </div>

      {/* Student Complete Attendance History Modal */}
      {isHistoryModalOpen && (
        <StudentAttendanceHistoryModal
          isOpen={isHistoryModalOpen}
          student={selectedHistoryStudent || (allStudents.length > 0 ? allStudents[0] : null)}
          allStudents={allStudents}
          onClose={() => setIsHistoryModalOpen(false)}
          onSelectStudent={(s) => setSelectedHistoryStudent(s)}
        />
      )}
    </div>
  );
}
