'use client';

import React, { useState, useEffect } from 'react';
import { getAllStudents } from '@/services/studentService';
import { Student } from '@/types/database';
import { StatCard } from '@/components/ui/StatCard';
import { BarChart3, Building2, DoorClosed, Users, RefreshCw } from 'lucide-react';

export default function StudentStrengthPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStrengthData = async () => {
    setIsLoading(true);
    try {
      const list = await getAllStudents();
      setStudents(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStrengthData();
  }, []);

  // Compute Department breakdown
  const departmentBreakdown = students.reduce((acc, student) => {
    const dept = student.department || 'General';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Compute Hostel Block breakdown (extracted from room_number e.g. A-201 -> Block A)
  const blockBreakdown = students.reduce((acc, student) => {
    const firstChar = student.room_number ? student.room_number.charAt(0).toUpperCase() : 'General';
    const blockName = ['A', 'B', 'C', 'D'].includes(firstChar) ? `Block ${firstChar}` : 'Other Blocks';
    acc[blockName] = (acc[blockName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalStudents = students.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" /> Student Strength Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Department-wise distribution and hostel room allocation statistics
          </p>
        </div>
        <button
          onClick={fetchStrengthData}
          disabled={isLoading}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Hostel Strength"
          value={totalStudents}
          subtitle="Enrolled Residents"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Active Departments"
          value={Object.keys(departmentBreakdown).length}
          subtitle="Academic Branches"
          icon={<Building2 className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Hostel Wings"
          value={Object.keys(blockBreakdown).length}
          subtitle="Occupied Residential Blocks"
          icon={<DoorClosed className="w-5 h-5" />}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Department Breakdown Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="font-bold text-slate-100 text-base mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-400" /> Department Distribution Strength
          </h3>
          <div className="space-y-4">
            {Object.entries(departmentBreakdown).map(([dept, count]) => {
              const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
              return (
                <div key={dept} className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-200">{dept}</span>
                    <span className="text-brand-400">{count} Students ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Block / Room Distribution Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="font-bold text-slate-100 text-base mb-4 flex items-center gap-2">
            <DoorClosed className="w-5 h-5 text-emerald-400" /> Hostel Block Allocation Strength
          </h3>
          <div className="space-y-4">
            {Object.entries(blockBreakdown).map(([block, count]) => {
              const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
              return (
                <div key={block} className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-200">{block}</span>
                    <span className="text-emerald-400">{count} Residents ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
