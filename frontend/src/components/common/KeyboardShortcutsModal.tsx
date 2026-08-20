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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-xs">
        {/* Header */}
        <div className="p-4 bg-gray-900/80 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/15 border border-blue-500/30 rounded-xl text-blue-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                Keyboard Shortcuts
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  MOMS Hotkeys
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Speed up production workflows with built-in hotkeys
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowHelpModal(false)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
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
                <div className="flex items-center gap-2 text-xs font-bold text-gray-300 border-b border-border/60 pb-1.5">
                  <Icon className={`w-4 h-4 ${cat.color}`} />
                  <span>{cat.title}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-900/60 border border-gray-800/80 hover:border-gray-700 p-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-xs truncate">
                          {item.actionName}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {item.description}
                        </div>
                      </div>

                      {/* Keycaps UI */}
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, i) => (
                          <React.Fragment key={i}>
                            <kbd className="min-w-[24px] px-2 py-1 bg-gray-950 text-gray-200 border border-gray-700/80 rounded-md font-mono text-[11px] font-bold text-center shadow-inner">
                              {k}
                            </kbd>
                            {i < item.keys.length - 1 && (
                              <span className="text-gray-500 text-[10px] font-mono">+</span>
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
        <div className="p-3.5 bg-gray-950/80 border-t border-border flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-gray-900 border border-gray-700 rounded text-gray-200 font-mono text-[10px]">?</kbd> anywhere to toggle this cheat sheet</span>
          </div>

          <button
            onClick={() => setShowHelpModal(false)}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg font-semibold transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
