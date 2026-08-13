'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Settings, Sliders, ShieldCheck, Palette, Tag, CheckCircle } from 'lucide-react';

const GRAPHIC_NAMING_SETTINGS = [
  {
    key: 'GRAPHIC_REQ_ID_PREFIX',
    label: 'Graphic Requirement ID Prefix',
    description: 'Prefix used when auto-generating Graphic Requirement IDs. Default: GR- (produces GR-000001, GR-000002 ...)',
    placeholder: 'e.g. GR-, ART-, GRFX-',
    defaultValue: 'GR-',
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [localPrefixValues, setLocalPrefixValues] = useState<Record<string, string>>({});

  const loadSettings = async () => {
    try {
      const res = await fetchApi('/settings');
      setData(res);
      // Initialize local values from DB
      const initials: Record<string, string> = {};
      GRAPHIC_NAMING_SETTINGS.forEach((ns) => {
        const found = res?.settings?.find((s: any) => s.key === ns.key);
        initials[ns.key] = found?.value ?? ns.defaultValue;
      });
      setLocalPrefixValues(initials);
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

  const handleSaveNamingSetting = async (key: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSavingKey(key);
    try {
      await fetchApi('/settings/system', {
        method: 'PUT',
        body: JSON.stringify({ key, value: trimmed }),
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2500);
      loadSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to save setting');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Settings...</div>;

  return (
    <div className="space-y-6 text-xs">
      <div className="bg-card border border-border p-6 rounded-xl">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-400" /> Platform Settings &amp; Configuration
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Configure production formulas, naming conventions &amp; organization defaults.
        </p>
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

        {/* System Naming Rules Card (read-only display) */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-4">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> System Naming Rules
          </h2>
          <div className="space-y-3">
            {data?.settings?.map((s: any) => (
              <div key={s.id} className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
                <div className="font-bold text-blue-400 font-mono">{s.key}</div>
                <div className="text-white font-bold mt-1">{s.value}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{s.description}</div>
              </div>
            ))}
            {(!data?.settings || data.settings.length === 0) && (
              <p className="text-gray-500 italic text-[11px]">No system settings configured yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Graphic Requirements Naming Conventions (Configurable) ── */}
      <div className="bg-card border border-amber-900/30 p-5 rounded-xl space-y-4">
        <div>
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-400" /> Graphic Requirements — Naming Conventions
            <span className="ml-1 text-[10px] text-amber-400 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded-full font-semibold">Configurable</span>
          </h2>
          <p className="text-[11px] text-gray-400 mt-1">
            These settings control how Graphic Requirement IDs are auto-generated.
            Changes take effect for all new requirements created after saving.
          </p>
        </div>

        <div className="space-y-4">
          {GRAPHIC_NAMING_SETTINGS.map((ns) => {
            const currentValue = localPrefixValues[ns.key] ?? ns.defaultValue;
            const dbValue = data?.settings?.find((s: any) => s.key === ns.key)?.value;
            const isModified = currentValue !== (dbValue ?? ns.defaultValue);
            const isSaving = savingKey === ns.key;
            const isSaved = savedKey === ns.key;

            return (
              <div key={ns.key} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-white text-[12px]">{ns.label}</span>
                      <span className="font-mono text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{ns.key}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{ns.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Preview */}
                  <div className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase">Preview:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {currentValue || ns.defaultValue}000001
                    </span>
                    <span className="text-gray-600 text-[10px]">→</span>
                    <span className="font-mono font-bold text-amber-300">
                      {currentValue || ns.defaultValue}000002
                    </span>
                  </div>

                  {/* Input */}
                  <input
                    type="text"
                    value={currentValue}
                    onChange={(e) => setLocalPrefixValues((prev) => ({ ...prev, [ns.key]: e.target.value }))}
                    placeholder={ns.placeholder}
                    maxLength={10}
                    className="w-28 bg-gray-950 border border-gray-700 focus:border-amber-500 rounded-lg px-3 py-2 text-white font-mono font-bold text-center focus:outline-none transition-colors"
                  />

                  {/* Save Button */}
                  {user?.role === 'MEDIA_MANAGER' && (
                    <button
                      onClick={() => handleSaveNamingSetting(ns.key, currentValue)}
                      disabled={isSaving || (!isModified && !!dbValue)}
                      className={`px-4 py-2 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all ${
                        isSaved
                          ? 'bg-emerald-600/30 border border-emerald-600 text-emerald-300'
                          : isModified || !dbValue
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20'
                          : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isSaved ? (
                        <><CheckCircle className="w-3.5 h-3.5" /> Saved</>
                      ) : isSaving ? (
                        'Saving...'
                      ) : (
                        'Save'
                      )}
                    </button>
                  )}
                </div>

                {/* Current active value from DB */}
                <div className="text-[10px] text-gray-600 flex items-center gap-1.5">
                  <span>Active in DB:</span>
                  <span className="font-mono text-gray-400">{dbValue || `${ns.defaultValue} (default — not yet persisted)`}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Business Rules Summary */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-2">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Graphic Requirement Business Rules (Active)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { rule: 'Every GR belongs to one Project', status: 'enforced' },
              { rule: 'Permanent internal ID auto-generated', status: 'enforced' },
              { rule: 'Naming convention configurable (this section)', status: 'enforced' },
              { rule: 'Production begins from Requirement Document (not Script)', status: 'enforced' },
              { rule: 'Only latest production file remains active', status: 'enforced' },
              { rule: 'Revision history preserved in timeline', status: 'enforced' },
              { rule: 'Timeline entries never deleted', status: 'enforced' },
              { rule: 'Same approval workflow as video production', status: 'enforced' },
              { rule: 'Completed requirements permanently available for audit', status: 'enforced' },
            ].map((item) => (
              <div key={item.rule} className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-gray-300">{item.rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
