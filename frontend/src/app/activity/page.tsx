'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Activity, ShieldCheck, User } from 'lucide-react';

export default function ActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi('/activity');
        setActivities(data);
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
          <Activity className="w-5 h-5 text-blue-400" /> Permanent Activity Center & Audit Log
        </h1>
        <p className="text-xs text-gray-400 mt-1">Immutable audit records. Deletion is strictly prohibited.</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Activity Stream...</div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="p-3 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-blue-400 mr-2">[{a.action}]</span>
                <span className="text-white font-semibold">{a.description}</span>
                <div className="text-[10px] text-gray-500 mt-0.5">By: {a.user?.name} ({a.user?.role})</div>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">{new Date(a.timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
