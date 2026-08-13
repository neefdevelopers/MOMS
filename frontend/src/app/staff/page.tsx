'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Users, ShieldCheck, Lock } from 'lucide-react';

export default function StaffPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi('/users');
        setUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 text-xs max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-card border border-border p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" /> Employee Directory & Profiles
          </h1>
          <p className="text-xs text-gray-400">
            Staff roster, designations, skill tags, and department affiliations.
          </p>
        </div>

        {/* Privacy Enforcement Tag */}
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-2 rounded-lg text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Employee Personal Contact Info (Phone, Email, Address) Protected & Hidden</span>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 bg-card border border-border rounded-xl flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Loading Staff Roster...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u.id} className="bg-card border border-border p-5 rounded-xl flex items-start gap-4 hover:border-zinc-700 transition-colors shadow-sm">
              <img
                src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={u.name}
                className="w-12 h-12 rounded-full object-cover border border-zinc-700 shrink-0"
              />
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-bold text-white text-sm truncate">{u.name}</h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full font-mono uppercase">
                    {u.role.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-emerald-400" /> System Comm Only
                  </span>
                </div>
                <p className="text-zinc-300 font-medium pt-0.5">{u.employeeProfile?.designation || 'Operations Staff'}</p>
                {u.employeeProfile?.department && (
                  <p className="text-gray-500 text-[11px]">Department: {u.employeeProfile.department.name}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
