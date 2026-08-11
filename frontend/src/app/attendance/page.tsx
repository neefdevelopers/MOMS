'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { UserCheck, Check, Clock, AlertOctagon } from 'lucide-react';

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const loadAttendance = async () => {
    try {
      const data = await fetchApi(`/attendance?date=${date}`);
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [date]);

  const handleMark = async (userId: string, status: string) => {
    try {
      await fetchApi('/attendance', {
        method: 'POST',
        body: JSON.stringify({ userId, date, status }),
      });
      loadAttendance();
    } catch (err: any) {
      alert(err.message || 'Failed to mark attendance');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" /> Employee Attendance Manager
          </h1>
          <p className="text-xs text-gray-400 mt-1">Managed exclusively by Media Manager. Duplicates for the same date are blocked.</p>
        </div>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg text-xs font-bold"
        />
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Attendance Sheet...</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900 text-gray-400 uppercase text-[10px] border-b border-border">
              <tr>
                <th className="p-4">Employee</th>
                <th className="p-4">Role</th>
                <th className="p-4">Department</th>
                <th className="p-4">Status Today</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-200">
              {records.map((r) => (
                <tr key={r.userId} className="hover:bg-gray-900/50">
                  <td className="p-4 font-bold text-white">{r.name}</td>
                  <td className="p-4 text-gray-400">{r.role}</td>
                  <td className="p-4 text-gray-400">{r.department}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        r.attendance?.status === 'PRESENT'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : r.attendance?.status === 'LATE'
                          ? 'bg-amber-500/20 text-amber-400'
                          : r.attendance?.status === 'ABSENT'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {r.attendance?.status || 'NOT MARKED'}
                    </span>
                  </td>
                  <td className="p-4">
                    {user?.role === 'MEDIA_MANAGER' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleMark(r.userId, 'PRESENT')}
                          className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded font-bold"
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleMark(r.userId, 'LATE')}
                          className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 rounded font-bold"
                        >
                          Late
                        </button>
                        <button
                          onClick={() => handleMark(r.userId, 'ABSENT')}
                          className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 rounded font-bold"
                        >
                          Absent
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
