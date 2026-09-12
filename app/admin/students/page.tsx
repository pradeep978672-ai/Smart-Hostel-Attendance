'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getAllStudents, createStudent, updateStudent, deleteStudent, searchStudents } from '@/services/studentService';
import { Student } from '@/types/database';
import { SearchBar } from '@/components/ui/SearchBar';
import { StudentCard } from '@/components/student/StudentCard';
import { StudentFormModal } from '@/components/student/StudentFormModal';
import { ResetPasswordModal } from '@/components/admin/ResetPasswordModal';
import { StudentAttendanceHistoryModal } from '@/components/admin/StudentAttendanceHistoryModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { UserPlus, Users, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function StudentListPage() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [resetPasswordStudent, setResetPasswordStudent] = useState<Student | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const list = await getAllStudents();
      setStudents(list);
    } catch (e) {
      showToast('error', 'Fetch Error', 'Failed to load student database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    let result = searchStudents(students, searchQuery);
    if (selectedDepartment !== 'ALL') {
      result = result.filter((s) => s.department === selectedDepartment);
    }
    return result;
  }, [students, searchQuery, selectedDepartment]);

  const handleAddSubmit = async (payload: any) => {
    try {
      await createStudent(payload);
      showToast('success', 'Student Created!', `Added ${payload.name} (${payload.roll_number})`);
      fetchStudents();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to add student.');
      throw err;
    }
  };

  const handleEditSubmit = async (payload: any) => {
    if (!editingStudent) return;
    try {
      await updateStudent(editingStudent.id, payload);
      showToast('success', 'Student Updated!', `Saved changes for ${editingStudent.name}`);
      setEditingStudent(null);
      fetchStudents();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to update student.');
      throw err;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;
    try {
      await deleteStudent(deletingStudent.id);
      showToast('success', 'Student Deleted', `Removed ${deletingStudent.name} from records.`);
      setDeletingStudent(null);
      fetchStudents();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to delete student.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-400" /> Hostel Student Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage, edit, search, and register hostel residents</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStudents}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-900/30 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Add New Student
          </button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/90 p-4 border border-slate-800 rounded-2xl">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search students by Name, Roll Number, Department, or Room..."
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Department:</span>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="ALL">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Electronic Communication Engineering">Electronic Communication Engineering</option>
            <option value="Cyber Security">Cyber Security</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Civil">Civil</option>
            <option value="Information Technology">Information Technology</option>
          </select>
        </div>
      </div>

      {/* Grid of Student Cards */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold">No students found matching current filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDepartment('ALL');
            }}
            className="mt-3 text-xs text-brand-400 hover:underline font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onEdit={(s) => setEditingStudent(s)}
              onDelete={(s) => setDeletingStudent(s)}
              onResetPassword={(s) => setResetPasswordStudent(s)}
              onViewHistory={(s) => setHistoryStudent(s)}
            />
          ))}
        </div>
      )}

      {/* Add Student Modal */}
      <StudentFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSubmit}
        title="Register New Student"
      />

      {/* Edit Student Modal */}
      {editingStudent && (
        <StudentFormModal
          isOpen={Boolean(editingStudent)}
          onClose={() => setEditingStudent(null)}
          onSubmit={handleEditSubmit}
          initialData={editingStudent}
          title="Edit Student Profile"
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingStudent && (
        <ConfirmDialog
          isOpen={Boolean(deletingStudent)}
          onClose={() => setDeletingStudent(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Student Record"
          message={`Are you sure you want to delete ${deletingStudent.name} (${deletingStudent.roll_number})? This action cannot be undone.`}
          confirmText="Delete Record"
          isDestructive={true}
        />
      )}

      {/* Reset Student Password Modal */}
      {resetPasswordStudent && (
        <ResetPasswordModal
          isOpen={Boolean(resetPasswordStudent)}
          student={resetPasswordStudent}
          onClose={() => setResetPasswordStudent(null)}
          onSuccess={() => fetchStudents()}
        />
      )}

      {/* Student Attendance History Modal */}
      {historyStudent && (
        <StudentAttendanceHistoryModal
          isOpen={Boolean(historyStudent)}
          student={historyStudent}
          allStudents={students}
          onClose={() => setHistoryStudent(null)}
          onSelectStudent={(s) => setHistoryStudent(s)}
        />
      )}
    </div>
  );
}
