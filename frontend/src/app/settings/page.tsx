'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Settings,
  Building2,
  Film,
  Tag,
  Users,
  BarChart3,
  Bell,
  Camera,
  HardDrive,
  ShieldCheck,
  Search,
  CheckCircle,
  Sliders,
  Sparkles,
  Save,
  RotateCcw,
  LayoutDashboard,
  Check,
  X,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import ConfigureWidgetsModal from '@/components/dashboard/ConfigureWidgetsModal';
import {
  DashboardWidgetConfig,
  DEFAULT_DASHBOARD_WIDGETS,
  DASHBOARD_WIDGETS_SETTING_KEY,
  LOCAL_STORAGE_WIDGETS_KEY,
  parseWidgetConfig,
} from '@/utils/dashboardWidgets';
import {
  SETTINGS_CATEGORIES,
  SYSTEM_SETTING_FIELDS,
  SettingsCategoryId,
  SettingFieldDefinition,
} from '@/utils/settingsCategories';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Settings,
  Building2,
  Film,
  Tag,
  Users,
  BarChart3,
  Bell,
  Camera,
  HardDrive,
  ShieldCheck,
};

import { RouteGuard } from '@/components/common/RouteGuard';

export default function SettingsPage() {
  return (
    <RouteGuard module="SETTINGS">
      <SettingsContent />
    </RouteGuard>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>('general');
  const [searchQuery, setSearchQuery] = useState('');

  // Setting Values state map
  const [settingValues, setSettingValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // Widget Configuration State for Reporting Settings
  const [widgetsConfig, setWidgetsConfig] = useState<DashboardWidgetConfig[]>(DEFAULT_DASHBOARD_WIDGETS);
  const [showWidgetModal, setShowWidgetModal] = useState(false);

  const isMediaManager = user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN';

  const loadSettings = async () => {
    try {
      const res = await fetchApi('/settings');
      setData(res);

      // Initialize all setting values from DB with defaults fallback
      const initialMap: Record<string, string> = {};
      SYSTEM_SETTING_FIELDS.forEach((field) => {
        const found = res?.settings?.find((s: any) => s.key === field.key);
        initialMap[field.key] = found?.value ?? field.defaultValue;
      });
      setSettingValues(initialMap);

      // Load widget configuration
      const dbWidgetSetting = res?.settings?.find((s: any) => s.key === DASHBOARD_WIDGETS_SETTING_KEY);
      const localSaved = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_WIDGETS_KEY) : null;
      if (dbWidgetSetting?.value) {
        setWidgetsConfig(parseWidgetConfig(dbWidgetSetting.value));
      } else if (localSaved) {
        setWidgetsConfig(parseWidgetConfig(localSaved));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSetting = async (key: string, value: string) => {
    if (!isMediaManager) return;
    setSavingKey(key);
    try {
      await fetchApi('/settings/system', {
        method: 'PUT',
        body: JSON.stringify({ key, value }),
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2500);
      await loadSettings();
    } catch (err: any) {
      alert(err.message || `Failed to save setting ${key}`);
    } finally {
      setSavingKey(null);
    }
  };

  const handleUpdateFormula = async (id: string, outputValue: number) => {
    if (!isMediaManager) return;
    try {
      await fetchApi(`/settings/formula/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ outputValue }),
      });
      await loadSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to update output formula');
    }
  };

  const handleSaveWidgetsConfig = async (newWidgets: DashboardWidgetConfig[]) => {
    setWidgetsConfig(newWidgets);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_WIDGETS_KEY, JSON.stringify(newWidgets));
    }
    if (isMediaManager) {
      try {
        await fetchApi('/settings/system', {
          method: 'PUT',
          body: JSON.stringify({
            key: DASHBOARD_WIDGETS_SETTING_KEY,
            value: JSON.stringify(newWidgets),
          }),
        });
        await loadSettings();
      } catch (err: any) {
        alert(err.message || 'Failed to save dashboard widgets configuration');
      }
    }
  };

  // Filtered settings by category and search
  const filteredFields = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return SYSTEM_SETTING_FIELDS.filter((field) => {
      if (q) {
        const matchKey = field.key.toLowerCase().includes(q);
        const matchLabel = field.label.toLowerCase().includes(q);
        const matchDesc = field.description.toLowerCase().includes(q);
        return matchKey || matchLabel || matchDesc;
      }
      return field.category === activeCategory;
    });
  }, [activeCategory, searchQuery]);

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400 space-y-3">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs">Loading Platform Settings &amp; Configuration...</p>
      </div>
    );
  }

  const currentCategoryMeta = SETTINGS_CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="space-y-6 text-xs">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-border p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white">Platform Settings &amp; Configuration</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                isMediaManager
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {isMediaManager ? '👑 Media Manager (Full Administrative Access)' : '🔒 Read-Only Mode (Restricted)'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Centrally manage the 10 core administrative areas (Departments, Languages, Output Formulas, Naming Standards, Dashboard Configuration, Notification Rules, Working Hours, Employee Targets, Equipment Categories, and Status Definitions).
          </p>
        </div>

        {/* Global Settings Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search all settings by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Settings Body: 10 Categories Tabs & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 10 Categories Navigation (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-1.5 bg-card border border-border p-3 rounded-2xl shadow-md self-start">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Configuration Categories (10)
          </div>

          <div className="space-y-1">
            {SETTINGS_CATEGORIES.map((cat, index) => {
              const Icon = CATEGORY_ICONS[cat.iconName] || Settings;
              const isActive = activeCategory === cat.id && !searchQuery;
              const count = SYSTEM_SETTING_FIELDS.filter((f) => f.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchQuery('');
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2.5 ${
                    isActive
                      ? 'bg-purple-600/20 text-white border border-purple-500/50 shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isActive
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate flex items-center gap-1.5">
                        <span>{index + 1}. {cat.title}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {cat.badge && (
                      <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800/60 px-1.5 py-0.5 rounded font-mono">
                        {cat.badge}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Category Settings View (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Category Header Card */}
          <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between gap-4 shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {searchQuery ? `Search Results for "${searchQuery}"` : currentCategoryMeta?.title}
                </h2>
                <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-full text-[10px] font-mono font-bold">
                  {filteredFields.length} Setting Fields
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery
                  ? 'Showing matching configuration parameters across all categories.'
                  : currentCategoryMeta?.description}
              </p>
            </div>

            {activeCategory === 'reporting' && !searchQuery && (
              <button
                onClick={() => setShowWidgetModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0"
              >
                <Sliders className="w-3.5 h-3.5" /> Dashboard Widgets Config
              </button>
            )}
          </div>

          {/* ── SPECIAL CATEGORY INSERTS ── */}

          {/* 1. Production Settings: Output Formulas Engine */}
          {(activeCategory === 'production' || searchQuery.toLowerCase().includes('formula')) && (
            <div className="bg-card border border-blue-900/40 p-5 rounded-2xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400" /> Production Output Formulas Engine
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                      Dynamic Weights
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Configurable deliverable weights used to calculate employee productivity targets and performance ratings.
                  </p>
                </div>
              </div>

              {(!data?.formulas || data.formulas.length === 0) ? (
                <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-400 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>
                    Confidential Operational Data: Production point scoring and commercial formulas are restricted to the Media Manager.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {data?.formulas?.map((f: any) => (
                    <div
                      key={f.id}
                      className="p-3.5 bg-gray-900/90 border border-gray-800 rounded-xl space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <span className="font-bold text-white text-xs block">{f.deliverableType}</span>
                        <span className="text-[10px] text-gray-400 line-clamp-2 mt-0.5">{f.description}</span>
                      </div>

                      <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-semibold">Standard Weight:</span>
                        {isMediaManager ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.1"
                              defaultValue={f.outputValue}
                              onBlur={(e) => handleUpdateFormula(f.id, parseFloat(e.target.value))}
                              className="w-16 bg-gray-950 border border-gray-700 text-cyan-400 font-mono font-bold px-2 py-1 rounded text-center focus:outline-none focus:border-blue-500 text-xs"
                            />
                            <span className="text-[10px] text-gray-500 font-mono">pts</span>
                          </div>
                        ) : (
                          <span className="font-mono font-bold text-cyan-400 text-xs">{f.outputValue} pts</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Reporting Settings: Active Widgets Summary */}
          {(activeCategory === 'reporting' || searchQuery.toLowerCase().includes('widget')) && (
            <div className="bg-card border border-indigo-900/40 p-5 rounded-2xl space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-indigo-400" /> Executive Dashboard Widgets Layout
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                      {widgetsConfig.filter((w) => w.enabled).length} of {widgetsConfig.length} Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Configure which widgets appear on the operational dashboard, reorder them, and set display sizes.
                  </p>
                </div>

                {isMediaManager && (
                  <button
                    onClick={() => setShowWidgetModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Reorder &amp; Configure
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {widgetsConfig.map((w) => (
                  <div
                    key={w.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      w.enabled
                        ? 'bg-gray-900/90 border-gray-700'
                        : 'bg-gray-950/40 border-gray-800/80 opacity-50'
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <p className="font-bold text-white text-xs truncate">{w.title}</p>
                      <p className="text-[9px] text-gray-500 font-mono">Order #{w.order}</p>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        w.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'
                      }`}
                    >
                      {w.enabled ? 'On' : 'Off'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Naming Standards: Interactive Preview Engine */}
          {(activeCategory === 'naming' || searchQuery.toLowerCase().includes('prefix')) && (
            <div className="bg-card border border-amber-900/40 p-5 rounded-2xl space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-400" /> Automated Code Generation Previews
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Live demonstration of internal identifiers generated using current prefix rules.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Graphic Req ID</span>
                  <div className="text-amber-400 font-bold text-sm">
                    {settingValues['GRAPHIC_REQ_ID_PREFIX'] || 'GR-'}000001
                  </div>
                </div>
                <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Script ID</span>
                  <div className="text-blue-400 font-bold text-sm">
                    {settingValues['SCRIPT_ID_PREFIX'] || 'SC-'}000001
                  </div>
                </div>
                <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Shoot Project ID</span>
                  <div className="text-purple-400 font-bold text-sm">
                    {settingValues['PROJECT_ID_PREFIX'] || 'SP-'}000001
                  </div>
                </div>
                <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Equipment Code</span>
                  <div className="text-cyan-400 font-bold text-sm">
                    {settingValues['EQUIPMENT_CODE_PREFIX'] || 'EQ-'}000001
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STANDARD SETTING FIELDS FORM LIST ── */}
          <div className="space-y-3.5">
            {filteredFields.map((field) => {
              const currentValue = settingValues[field.key] ?? field.defaultValue;
              const dbValue = data?.settings?.find((s: any) => s.key === field.key)?.value;
              const isModified = currentValue !== (dbValue ?? field.defaultValue);
              const isSaving = savingKey === field.key;
              const isSaved = savedKey === field.key;

              return (
                <div
                  key={field.key}
                  className="bg-card border border-border p-4.5 rounded-2xl space-y-3 shadow-md hover:border-gray-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs">{field.label}</span>
                        <span className="font-mono text-[10px] text-gray-400 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
                          {field.key}
                        </span>
                        {searchQuery && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                            {field.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">{field.description}</p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isSaved && (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 border border-emerald-800 px-2 py-1 rounded-lg animate-fade-in">
                          <CheckCircle className="w-3 h-3" /> Saved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Input Control & Save Trigger */}
                  <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between gap-3 flex-wrap">
                    {/* Control input based on field type */}
                    <div className="flex-1 min-w-[200px]">
                      {isMediaManager ? (
                        field.type === 'boolean' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = currentValue === 'true' ? 'false' : 'true';
                                setSettingValues((prev) => ({ ...prev, [field.key]: nextVal }));
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                                currentValue === 'true'
                                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-gray-900 text-gray-400 border border-gray-800'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  currentValue === 'true' ? 'bg-emerald-400' : 'bg-gray-600'
                                }`}
                              />
                              {currentValue === 'true' ? 'Enabled (Active)' : 'Disabled'}
                            </button>
                          </div>
                        ) : field.type === 'select' ? (
                          <select
                            value={currentValue}
                            onChange={(e) =>
                              setSettingValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            className="w-full bg-gray-950 border border-gray-800 text-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                          >
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'number' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={currentValue}
                              onChange={(e) =>
                                setSettingValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              placeholder={field.placeholder}
                              className="w-36 bg-gray-950 border border-gray-800 text-white font-mono font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                            />
                            {field.unit && (
                              <span className="text-[10px] text-gray-500 font-mono">{field.unit}</span>
                            )}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={currentValue}
                            onChange={(e) =>
                              setSettingValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            placeholder={field.placeholder}
                            className="w-full bg-gray-950 border border-gray-800 text-white font-medium rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                          />
                        )
                      ) : (
                        <div className="text-xs font-mono font-bold text-gray-300 bg-gray-950 border border-gray-800/80 px-3 py-2 rounded-xl inline-block">
                          {field.type === 'boolean'
                            ? currentValue === 'true'
                              ? 'Enabled'
                              : 'Disabled'
                            : `${currentValue} ${field.unit || ''}`}
                        </div>
                      )}
                    </div>

                    {/* Action Save Button */}
                    {isMediaManager && (
                      <button
                        onClick={() => handleSaveSetting(field.key, currentValue)}
                        disabled={isSaving || (!isModified && !!dbValue)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                          isSaved
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                            : isModified || !dbValue
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                            : 'bg-gray-900 border border-gray-800 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isSaving ? (
                          'Saving...'
                        ) : isSaved ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Saved
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" /> Save
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredFields.length === 0 && (
              <div className="bg-card border border-dashed border-gray-800 p-8 rounded-2xl text-center space-y-2">
                <Search className="w-6 h-6 text-gray-600 mx-auto" />
                <p className="text-gray-400 font-bold">No settings match your search keyword.</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-purple-400 hover:underline"
                >
                  Clear search query
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configure Dashboard Widgets Modal */}
      <ConfigureWidgetsModal
        isOpen={showWidgetModal}
        onClose={() => setShowWidgetModal(false)}
        widgets={widgetsConfig}
        onSave={handleSaveWidgetsConfig}
        isMediaManager={isMediaManager}
      />
    </div>
  );
}
