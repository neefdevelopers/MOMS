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
      <div className="p-12 text-center text-slate-500 space-y-3">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs">Loading Platform Settings &amp; Configuration...</p>
      </div>
    );
  }

  const currentCategoryMeta = SETTINGS_CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="space-y-4 text-slate-800">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-600">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">Platform Settings &amp; Configuration</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage system policies, default preferences, and operational rules</p>
          </div>
        </div>

        {/* Global Settings Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search all settings by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Settings Body: 10 Categories Tabs & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: 10 Categories Navigation (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-1 bg-white border border-slate-200 p-3 rounded-xl shadow-sm self-start">
          <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Configuration Categories (10)
          </div>

          <div className="space-y-0.5">
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
                  className={`w-full text-left p-2 rounded-lg transition-all flex items-center justify-between gap-2.5 ${
                    isActive
                      ? 'bg-purple-50 text-purple-900 border border-purple-200 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-md shrink-0 ${
                        isActive
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                        <span>{index + 1}. {cat.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {cat.badge && (
                      <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-mono font-medium">
                        {cat.badge}
                      </span>
                    )}
                    <span className="text-[11px] font-mono font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Category Settings View (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-3.5">
          {/* Category Header Card */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  {searchQuery ? `Search Results for "${searchQuery}"` : currentCategoryMeta?.title}
                </h2>
                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-mono font-medium">
                  {filteredFields.length} Setting Fields
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                {searchQuery
                  ? 'Showing matching configuration parameters across all categories.'
                  : currentCategoryMeta?.description}
              </p>
            </div>

            {activeCategory === 'reporting' && !searchQuery && (
              <button
                onClick={() => setShowWidgetModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 shrink-0 self-start sm:self-center"
              >
                <Sliders className="w-3.5 h-3.5" /> Dashboard Widgets Config
              </button>
            )}
          </div>

          {/* ── SPECIAL CATEGORY INSERTS ── */}

          {/* 1. Production Settings: Output Formulas Engine */}
          {(activeCategory === 'production' || searchQuery.toLowerCase().includes('formula')) && (
            <div className="bg-white border border-blue-200 p-4 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" /> Production Output Formulas Engine
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                      Dynamic Weights
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configurable deliverable weights used to calculate employee productivity targets and performance ratings.
                  </p>
                </div>
              </div>

              {(!data?.formulas || data.formulas.length === 0) ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>
                    Confidential Operational Data: Production point scoring and commercial formulas are restricted to the Media Manager.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {data?.formulas?.map((f: any) => (
                    <div
                      key={f.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 text-xs block">{f.deliverableType}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{f.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">Standard Weight:</span>
                        {isMediaManager ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              defaultValue={f.outputValue}
                              onBlur={(e) => handleUpdateFormula(f.id, parseFloat(e.target.value))}
                              className="w-16 bg-white border border-slate-200 text-cyan-700 font-mono font-bold px-2 py-1 rounded text-center focus:outline-none focus:border-blue-500 text-xs shadow-sm"
                            />
                            <span className="text-xs text-slate-400 font-mono">pts</span>
                          </div>
                        ) : (
                          <span className="font-mono font-bold text-cyan-700 text-xs">{f.outputValue} pts</span>
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
            <div className="bg-white border border-indigo-200 p-4 rounded-xl space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-indigo-600" /> Executive Dashboard Widgets Layout
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                      {widgetsConfig.filter((w) => w.enabled).length} of {widgetsConfig.length} Active
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure which widgets appear on the operational dashboard, reorder them, and set display sizes.
                  </p>
                </div>

                {isMediaManager && (
                  <button
                    onClick={() => setShowWidgetModal(true)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Reorder &amp; Configure
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {widgetsConfig.map((w) => (
                  <div
                    key={w.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      w.enabled
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-slate-50/50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 text-xs truncate">{w.title}</p>
                      <p className="text-[11px] text-slate-400 font-mono">Order #{w.order}</p>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        w.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
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
            <div className="bg-white border border-amber-200 p-4 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-600" /> Automated Code Generation Previews
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live demonstration of internal identifiers generated using current prefix rules.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 font-mono">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">Graphic Req ID</span>
                  <div className="text-amber-700 font-bold text-sm">
                    {settingValues['GRAPHIC_REQ_ID_PREFIX'] || 'GR-'}000001
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">Script ID</span>
                  <div className="text-blue-700 font-bold text-sm">
                    {settingValues['SCRIPT_ID_PREFIX'] || 'SC-'}000001
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">Shoot Project ID</span>
                  <div className="text-purple-700 font-bold text-sm">
                    {settingValues['PROJECT_ID_PREFIX'] || 'SP-'}000001
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">Equipment Code</span>
                  <div className="text-cyan-700 font-bold text-sm">
                    {settingValues['EQUIPMENT_CODE_PREFIX'] || 'EQ-'}000001
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STANDARD SETTING FIELDS FORM LIST ── */}
          <div className="space-y-3">
            {filteredFields.map((field) => {
              const currentValue = settingValues[field.key] ?? field.defaultValue;
              const dbValue = data?.settings?.find((s: any) => s.key === field.key)?.value;
              const isModified = currentValue !== (dbValue ?? field.defaultValue);
              const isSaving = savingKey === field.key;
              const isSaved = savedKey === field.key;

              return (
                <div
                  key={field.key}
                  className="bg-white border border-slate-200 p-4 rounded-xl space-y-2.5 shadow-sm hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm">{field.label}</span>
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                          {field.key}
                        </span>
                        {searchQuery && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            {field.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-normal">{field.description}</p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isSaved && (
                        <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md animate-fade-in">
                          <CheckCircle className="w-3.5 h-3.5" /> Saved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Input Control & Save Trigger */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
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
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                                currentValue === 'true'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                                  : 'bg-slate-50 text-slate-600 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  currentValue === 'true' ? 'bg-emerald-500' : 'bg-slate-400'
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
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
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
                              className="w-36 bg-slate-50 border border-slate-200 text-slate-900 font-mono font-semibold rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                            />
                            {field.unit && (
                              <span className="text-xs text-slate-400 font-mono font-medium">{field.unit}</span>
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
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-normal rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                          />
                        )
                      ) : (
                        <div className="text-xs sm:text-sm font-mono font-semibold text-slate-800 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg inline-block">
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
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                          isSaved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isModified || !dbValue
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                            : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed'
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
              <div className="bg-white border border-dashed border-slate-200 p-8 rounded-xl text-center space-y-2">
                <Search className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-slate-600 font-semibold text-xs sm:text-sm">No settings match your search keyword.</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-semibold text-purple-600 hover:underline"
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
