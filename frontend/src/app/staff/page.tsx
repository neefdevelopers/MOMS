'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Users, Mail, Shield } from 'lucide-react';

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
    <div className="space-y-6 text-xs">
      <div className="bg-card border border-border p-6 rounded-xl">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" /> Employee Directory & Profiles
        </h1>
        <p className="text-xs text-gray-400 mt-1">Staff roster, designations, and department affiliations.</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Staff Roster...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u.id} className="bg-card border border-border p-5 rounded-xl flex items-start gap-4">
              <img
                src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={u.name}
                className="w-12 h-12 rounded-full object-cover border border-gray-700"
              />
              <div>
                <h3 className="font-bold text-white text-sm">{u.name}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full uppercase">
                  {u.role.replace('_', ' ')}
                </span>
                <p className="text-gray-400 mt-1">{u.employeeProfile?.designation}</p>
                <p className="text-gray-500 text-[10px]">{u.employeeProfile?.department?.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
