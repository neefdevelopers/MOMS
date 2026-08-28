'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  UserCheck,
  CheckCircle,
  Clock,
  UserX,
  Lock,
  ShieldCheck,
  Calendar,
  AlertCircle,
  CalendarDays,
  FileText,
  Search,
  MessageSquare,
  History,
  TrendingUp,
  Percent,
  Users,
  Award,
  BarChart3,
} from 'lucide-react';

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Remarks state
  const [remarksState, setRemarksState] = useState<Record<string, string>>({});
  const [editingRemarksUserId, setEditingRemarksUserId] = useState<string | null>(null);

  const isMediaManager = user?.role === 'MEDIA_MANAGER';

  const loadAttendance = async () => {
    try {
      const [attData, dashSummary] = await Promise.all([
        fetchApi(`/attendance?date=${date}`),
        fetchApi('/attendance/dashboard').catch(() => null),
      ]);

      if (Array.isArray(attData)) {
        setRecords(attData);
        const initRemarks: Record<string, string> = {};
        attData.forEach((r) => {
          if (r.attendance?.remarks) {
            initRemarks[r.userId] = r.attendance.remarks;
          }
        });
        setRemarksState(initRemarks);
      }
      setDashboardData(dashSummary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [date]);

  const handleMark = async (userId: string, status: string, name: string) => {
    if (!isMediaManager) {
      alert('Attendance shall be recorded manually by the Media Manager. Employees shall not mark their own attendance.');
      return;
    }

    setUpdatingUserId(userId);
    try {
      await fetchApi('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          date,
          status,
          remarks: remarksState[userId] || undefined,
        }),
      });
      loadAttendance();
    } catch (err: any) {
      alert(err.message || 'Failed to record attendance');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.role?.toLowerCase().includes(q) ||
      r.attendance?.recordedBy?.name?.toLowerCase().includes(q)
    );
  });

  const todaySummary = dashboardData?.today;
  const monthlySummary = dashboardData?.monthlySummary;

  return (
    <div className="space-y-6 text-xs max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-card border border-border p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            {user?.role === 'STAFF' ? 'My Personal Attendance Log' : 'Attendance Dashboard & Register'}
          </h1>
          <p className="text-xs text-gray-400">
            {user?.role === 'STAFF'
              ? 'View your daily attendance status, working hours, check-in log, and Media Manager remarks.'
              : "Real-time tracking of Today's Attendance, Absent, Late, Half Day staff, Attendance %, and Monthly Summary."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-gray-400 font-semibold flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-blue-400" /> Register Date:
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* DASHBOARD SUMMARY WIDGETS (Visible to Media Manager & Admins) */}
      {user?.role !== 'STAFF' && todaySummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Today's Attendance */}
          <div className="bg-gray-900/90 border border-emerald-900/40 p-4 rounded-xl space-y-1">
            <div className="text-gray-400 font-bold uppercase text-[9px] flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Today's Present
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">{todaySummary.presentCount}</div>
            <div className="text-[10px] text-gray-500 font-mono">Out of {todaySummary.totalEmployees} Active Staff</div>
          </div>

          {/* 2. Absent Employees */}
          <div className="bg-gray-900/90 border border-red-900/40 p-4 rounded-xl space-y-1">
            <div className="text-gray-400 font-bold uppercase text-[9px] flex items-center gap-1">
              <UserX className="w-3.5 h-3.5 text-red-400" /> Absent Employees
            </div>
            <div className="text-2xl font-extrabold text-red-400">{todaySummary.absentCount}</div>
            <div className="text-[10px] text-gray-500 font-mono">
              {todaySummary.absentList?.length > 0
                ? todaySummary.absentList.map((a: any) => a.name).join(', ')
                : 'Zero Absences Today'}
            </div>
          </div>

          {/* 3. Late Employees */}
          <div className="bg-gray-900/90 border border-amber-900/40 p-4 rounded-xl space-y-1">
            <div className="text-gray-400 font-bold uppercase text-[9px] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Late Employees
            </div>
            <div className="text-2xl font-extrabold text-amber-400">{todaySummary.lateCount}</div>
            <div className="text-[10px] text-gray-500 font-mono truncate">
              {todaySummary.lateList?.length > 0
                ? todaySummary.lateList.map((l: any) => l.name).join(', ')
                : 'Zero Late Arrivals'}
            </div>
          </div>

          {/* 4. Half Day Employees */}
          <div className="bg-gray-900/90 border border-cyan-900/40 p-4 rounded-xl space-y-1">
            <div className="text-gray-400 font-bold uppercase text-[9px] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Half Day Employees
            </div>
            <div className="text-2xl font-extrabold text-cyan-400">{todaySummary.halfDayCount}</div>
            <div className="text-[10px] text-gray-500 font-mono truncate">
              {todaySummary.halfDayList?.length > 0
                ? todaySummary.halfDayList.map((h: any) => h.name).join(', ')
                : 'Zero Half-Days'}
            </div>
          </div>

          {/* 5. Attendance Percentage */}
          <div className="bg-gray-900/90 border border-purple-900/40 p-4 rounded-xl space-y-1">
            <div className="text-gray-400 font-bold uppercase text-[9px] flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-purple-400" /> Attendance Rate
            </div>
            <div className="text-2xl font-extrabold text-purple-300">{todaySummary.attendancePercentage}%</div>
            <div className="text-[10px] text-gray-500 font-mono">Today's Presence Rate</div>
          </div>

          {/* 6. Monthly Attendance Summary */}
          <div className="bg-gray-900/90 border border-blue-900/40 p-4 rounded-xl space-y-1">
            <div className="text-gray-400 font-bold uppercase text-[9px] flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" /> Monthly Summary
            </div>
            <div className="text-2xl font-extrabold text-blue-400">{monthlySummary?.monthlyAveragePercentage || 0}%</div>
            <div className="text-[10px] text-gray-500 font-mono">{monthlySummary?.month || 'Current Month'}</div>
          </div>
        </div>
      )}

      {/* Governance Banner & Search Bar (Visible to Managers) */}
      {user?.role !== 'STAFF' && (
        <>
          <div className="p-4 bg-gray-900/80 border border-emerald-900/40 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-emerald-300 flex items-center gap-2 uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Attendance Governance Standard Compliance
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-300">
              <div className="flex items-start gap-2 bg-gray-950 p-2.5 rounded border border-gray-800">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Media Manager Authority:</strong> Attendance shall be recorded manually by the Media Manager.
                </div>
              </div>
              <div className="flex items-start gap-2 bg-gray-950 p-2.5 rounded border border-gray-800">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Employee Self-Marking Prohibited:</strong> Employees cannot alter attendance entries or mark self-attendance.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Employee Name, Email, Department, Recorded By..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-gray-500 font-medium focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 text-gray-400 text-xs font-semibold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Present: {records.filter(r => r.attendance?.status === 'PRESENT').length}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Late: {records.filter(r => r.attendance?.status === 'LATE').length}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Half Day: {records.filter(r => r.attendance?.status === 'HALF_DAY').length}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> Absent: {records.filter(r => r.attendance?.status === 'ABSENT').length}</span>
            </div>
          </div>
        </>
      )}

      {/* Attendance Table */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 bg-card border border-border rounded-xl flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Loading Daily Attendance Register...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-8 text-center bg-card border border-border rounded-xl text-gray-400">
          No employee attendance records found for the selected date.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/90 text-gray-400 uppercase text-[10px] border-b border-border font-mono tracking-wider">
              <tr>
                <th className="p-4">Employee</th>
                <th className="p-4">Department</th>
                <th className="p-4">Attendance Status</th>
                <th className="p-4">Remarks (Optional)</th>
                <th className="p-4">Recorded By</th>
                <th className="p-4 text-right">Action Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80 text-gray-200">
              {filteredRecords.map((r) => {
                const att = r.attendance;
                const attStatus = att?.status;
                const recordedBy = att?.recordedBy;
                const isUpdating = updatingUserId === r.userId;
                const isEditingRemarks = editingRemarksUserId === r.userId;

                return (
                  <tr key={r.userId} className="hover:bg-gray-900/40 transition-colors">
                    {/* Employee */}
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{r.name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{r.email}</div>
                    </td>

                    {/* Department */}
                    <td className="p-4 font-semibold text-purple-300">{r.department}</td>

                    {/* Status */}
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border shrink-0 inline-block ${
                          attStatus === 'PRESENT'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : attStatus === 'LATE'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : attStatus === 'HALF_DAY'
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                            : attStatus === 'ABSENT'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-gray-800 text-gray-400 border-gray-700'
                        }`}
                      >
                        {attStatus === 'HALF_DAY' ? 'HALF DAY' : attStatus || 'UNMARKED'}
                      </span>
                    </td>

                    {/* Remarks (Optional) */}
                    <td className="p-4">
                      {isEditingRemarks ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Add remarks..."
                            value={remarksState[r.userId] || ''}
                            onChange={(e) => setRemarksState({ ...remarksState, [r.userId]: e.target.value })}
                            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs"
                          />
                          <button
                            onClick={() => setEditingRemarksUserId(null)}
                            className="px-2 py-1 bg-blue-600 text-white text-[10px] rounded font-bold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 italic text-[11px]">
                            {remarksState[r.userId] || att?.remarks || 'No remarks'}
                          </span>
                          {isMediaManager && (
                            <button
                              onClick={() => setEditingRemarksUserId(r.userId)}
                              className="text-gray-500 hover:text-blue-400 text-[10px] underline"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Recorded By */}
                    <td className="p-4">
                      {recordedBy ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-gray-200 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {recordedBy.name}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">Media Manager</div>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-[11px]">Not Yet Recorded</span>
                      )}
                    </td>

                    {/* Action Control */}
                    <td className="p-4 text-right">
                      {isMediaManager ? (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            disabled={isUpdating}
                            onClick={() => handleMark(r.userId, 'PRESENT', r.name)}
                            className={`px-2.5 py-1 rounded font-bold text-[11px] transition-colors border ${
                              attStatus === 'PRESENT'
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                                : 'bg-emerald-600/10 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            disabled={isUpdating}
                            onClick={() => handleMark(r.userId, 'LATE', r.name)}
                            className={`px-2.5 py-1 rounded font-bold text-[11px] transition-colors border ${
                              attStatus === 'LATE'
                                ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                                : 'bg-amber-600/10 hover:bg-amber-600/30 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            disabled={isUpdating}
                            onClick={() => handleMark(r.userId, 'HALF_DAY', r.name)}
                            className={`px-2.5 py-1 rounded font-bold text-[11px] transition-colors border ${
                              attStatus === 'HALF_DAY'
                                ? 'bg-cyan-600 text-white border-cyan-500 shadow-md'
                                : 'bg-cyan-600/10 hover:bg-cyan-600/30 text-cyan-300 border-cyan-500/30'
                            }`}
                          >
                            Half Day
                          </button>
                          <button
                            disabled={isUpdating}
                            onClick={() => handleMark(r.userId, 'ABSENT', r.name)}
                            className={`px-2.5 py-1 rounded font-bold text-[11px] transition-colors border ${
                              attStatus === 'ABSENT'
                                ? 'bg-red-600 text-white border-red-500 shadow-md'
                                : 'bg-red-600/10 hover:bg-red-600/30 text-red-300 border-red-500/30'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 bg-gray-900 border border-gray-800 text-gray-400 px-3 py-1.5 rounded-lg font-medium text-[11px]">
                          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Recorded by Media Manager</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
