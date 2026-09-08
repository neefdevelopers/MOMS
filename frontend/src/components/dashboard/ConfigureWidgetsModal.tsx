'use client';

import React, { useState } from 'react';
import {
  DashboardWidgetConfig,
  DEFAULT_DASHBOARD_WIDGETS,
} from '@/utils/dashboardWidgets';
import {
  X,
  Sliders,
  Check,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sparkles,
  Film,
  Clock,
  TrendingUp,
  Users,
  Camera,
  Calendar,
  Radio,
  Layers,
  ShieldCheck,
} from 'lucide-react';

interface ConfigureWidgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: DashboardWidgetConfig[];
  onSave: (newWidgets: DashboardWidgetConfig[]) => Promise<void>;
  isMediaManager: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Film,
  Clock,
  TrendingUp,
  Users,
  Camera,
  Calendar,
  Sliders,
  Radio,
  Layers,
};

export default function ConfigureWidgetsModal({
  isOpen,
  onClose,
  widgets,
  onSave,
  isMediaManager,
}: ConfigureWidgetsModalProps) {
  const [localWidgets, setLocalWidgets] = useState<DashboardWidgetConfig[]>(() =>
    [...widgets].sort((a, b) => a.order - b.order)
  );
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPERATIONAL' | 'RESOURCE' | 'PERFORMANCE' | 'AUDIT'>('ALL');

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleMove = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localWidgets.length) return;

    const updated = [...localWidgets];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Re-assign order numbers
    const reordered = updated.map((w, idx) => ({ ...w, order: idx + 1 }));
    setLocalWidgets(reordered);
  };

  const handleSizeChange = (id: string, size: 'normal' | 'full') => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, size } : w))
    );
  };

  const handleLimitChange = (id: string, limit: number) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, itemLimit: limit } : w))
    );
  };

  const handleResetDefaults = () => {
    if (confirm('Reset dashboard widgets layout to system defaults?')) {
      setLocalWidgets([...DEFAULT_DASHBOARD_WIDGETS]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(localWidgets);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save widget configuration');
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = localWidgets.filter((w) => w.enabled).length;

  const filteredWidgets = localWidgets.filter((w) => {
    if (activeTab === 'ALL') return true;
    return w.category.toUpperCase() === activeTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in text-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Configure Dashboard Widgets</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Media Manager
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Customize which operational widgets appear on your dashboard and reorder them.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Category Filter Bar */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Active:</span>
            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              {enabledCount} of {localWidgets.length} Widgets
            </span>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-lg">
            {(['ALL', 'OPERATIONAL', 'RESOURCE', 'PERFORMANCE', 'AUDIT'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                  activeTab === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Widgets List */}
        <div className="p-5 space-y-2.5 overflow-y-auto flex-1 bg-white">
          {filteredWidgets.map((widget) => {
            const originalIndex = localWidgets.findIndex((w) => w.id === widget.id);
            const IconComponent = ICON_MAP[widget.iconName] || Sliders;
            const isFirst = originalIndex === 0;
            const isLast = originalIndex === localWidgets.length - 1;

            return (
              <div
                key={widget.id}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  widget.enabled
                    ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-xs'
                    : 'bg-slate-50/40 border-slate-200 opacity-60'
                }`}
              >
                {/* Drag / Reorder Buttons */}
                <div className="flex flex-col gap-0.5 items-center">
                  <button
                    onClick={() => handleMove(originalIndex, 'UP')}
                    disabled={isFirst}
                    title="Move Up"
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-200 rounded transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    #{originalIndex + 1}
                  </span>
                  <button
                    onClick={() => handleMove(originalIndex, 'DOWN')}
                    disabled={isLast}
                    title="Move Down"
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-200 rounded transition-colors"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Widget Icon & Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl border shrink-0 ${
                      widget.enabled
                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-xs">{widget.title}</h4>
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                        {widget.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {widget.description}
                    </p>
                  </div>
                </div>

                {/* Widget Specific Controls (Size / Limits) */}
                {widget.enabled && (
                  <div className="hidden sm:flex items-center gap-2">
                    {/* Size toggle */}
                    <div className="flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-lg">
                      <button
                        onClick={() => handleSizeChange(widget.id, 'normal')}
                        className={`px-2 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                          widget.size !== 'full'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Standard
                      </button>
                      <button
                        onClick={() => handleSizeChange(widget.id, 'full')}
                        className={`px-2 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                          widget.size === 'full'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Full Width
                      </button>
                    </div>

                    {/* Item limit selector for list widgets */}
                    {widget.itemLimit !== undefined && (
                      <select
                        value={widget.itemLimit}
                        onChange={(e) => handleLimitChange(widget.id, parseInt(e.target.value))}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] rounded px-1.5 py-1 focus:outline-none focus:border-blue-500"
                      >
                        <option value={3}>Top 3</option>
                        <option value={5}>Top 5</option>
                        <option value={10}>Top 10</option>
                      </select>
                    )}
                  </div>
                )}

                {/* Enable / Disable Toggle Button */}
                <button
                  onClick={() => handleToggle(widget.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 ${
                    widget.enabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                >
                  {widget.enabled ? (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Enabled
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Disabled
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold bg-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save Widget Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
