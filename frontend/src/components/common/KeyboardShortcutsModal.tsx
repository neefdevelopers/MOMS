'use client';

import React from 'react';
import {
  Keyboard,
  X,
  Search,
  Compass,
  Zap,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useKeyboardShortcuts, SHORTCUTS_LIST } from '@/lib/keyboard-shortcuts-context';

export function KeyboardShortcutsModal() {
  const { showHelpModal, setShowHelpModal } = useKeyboardShortcuts();

  if (!showHelpModal) return null;

  const categories = [
    {
      id: 'SEARCH',
      title: 'Global Search & Discovery',
      icon: Search,
      color: 'text-blue-400',
      items: SHORTCUTS_LIST.filter((s) => s.category === 'SEARCH'),
    },
    {
      id: 'ACTIONS',
      title: 'Operations, Forms & Controls',
      icon: Zap,
      color: 'text-amber-400',
      items: SHORTCUTS_LIST.filter((s) => s.category === 'ACTIONS'),
    },
    {
      id: 'NAVIGATION',
      title: 'Instant Module Navigation',
      icon: Compass,
      color: 'text-emerald-400',
      items: SHORTCUTS_LIST.filter((s) => s.category === 'NAVIGATION'),
    },
    {
      id: 'SYSTEM',
      title: 'System & Assistance',
      icon: HelpCircle,
      color: 'text-purple-400',
      items: SHORTCUTS_LIST.filter((s) => s.category === 'SYSTEM'),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-xs">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Keyboard Shortcuts
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  MOMS Hotkeys
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Speed up production workflows with built-in hotkeys
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowHelpModal(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.id} className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-1.5">
                  <Icon className={`w-4 h-4 ${cat.color.replace('400', '600')}`} />
                  <span>{cat.title}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 border border-slate-200 hover:border-slate-300 p-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors shadow-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-xs truncate">
                          {item.actionName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {item.description}
                        </div>
                      </div>

                      {/* Keycaps UI */}
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, i) => (
                          <React.Fragment key={i}>
                            <kbd className="min-w-[24px] px-2 py-1 bg-white text-slate-700 border border-slate-300 rounded-md font-mono text-[11px] font-bold text-center shadow-xs">
                              {k}
                            </kbd>
                            {i < item.keys.length - 1 && (
                              <span className="text-slate-400 text-[10px] font-mono">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono text-[10px]">?</kbd> anywhere to toggle this cheat sheet</span>
          </div>

          <button
            onClick={() => setShowHelpModal(false)}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
