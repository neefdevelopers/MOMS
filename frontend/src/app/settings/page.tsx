'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Settings, Sliders, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const res = await fetchApi('/settings');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleUpdateFormula = async (id: string, outputValue: number) => {
    try {
      await fetchApi(`/settings/formula/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ outputValue }),
      });
      loadSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to update formula');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Settings...</div>;

  return (
    <div className="space-y-6 text-xs">
      <div className="bg-card border border-border p-6 rounded-xl">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-400" /> Platform Settings & Formula Engine
        </h1>
        <p className="text-xs text-gray-400 mt-1">Configure production formulas, naming conventions & organization defaults.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Production Formula Engine Card */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-4">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" /> Production Output Formulas Engine
          </h2>
          <p className="text-gray-400 text-[11px]">
            Formula weights used for employee productivity reports. (Not hardcoded).
          </p>

          <div className="space-y-3">
            {data?.formulas?.map((f: any) => (
              <div key={f.id} className="p-3 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{f.deliverableType}</div>
                  <div className="text-[10px] text-gray-500">{f.description}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-semibold">Weight:</span>
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={f.outputValue}
                    onBlur={(e) => handleUpdateFormula(f.id, parseFloat(e.target.value))}
                    className="w-16 bg-gray-950 border border-gray-700 text-gray-200 px-2 py-1 rounded text-center font-bold"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Naming Rules Card */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-4">
          <h2 className="font-bold text-white text-sm">System Naming Rules</h2>
          <div className="space-y-3">
            {data?.settings?.map((s: any) => (
              <div key={s.id} className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
                <div className="font-bold text-blue-400 font-mono">{s.key}</div>
                <div className="text-white font-bold mt-1">{s.value}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{s.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
