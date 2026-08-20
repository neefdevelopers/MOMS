'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface ShortcutDefinition {
  id: string;
  category: 'SEARCH' | 'NAVIGATION' | 'ACTIONS' | 'SYSTEM';
  keys: string[];
  description: string;
  actionName: string;
}

export const SHORTCUTS_LIST: ShortcutDefinition[] = [
  // Search & Discovery
  {
    id: 'global-search',
    category: 'SEARCH',
    keys: ['Ctrl', 'K'],
    description: 'Focus Global Search bar',
    actionName: 'Global Search',
  },
  {
    id: 'advanced-search',
    category: 'SEARCH',
    keys: ['Ctrl', 'Shift', 'F'],
    description: 'Open Advanced Multi-Condition Search',
    actionName: 'Advanced Search',
  },

  // Navigation
  {
    id: 'nav-dashboard',
    category: 'NAVIGATION',
    keys: ['Alt', 'D'],
    description: 'Navigate to Dashboard',
    actionName: 'Dashboard',
  },
  {
    id: 'nav-projects',
    category: 'NAVIGATION',
    keys: ['Alt', 'P'],
    description: 'Navigate to Projects repository',
    actionName: 'Projects',
  },
  {
    id: 'nav-scripts',
    category: 'NAVIGATION',
    keys: ['Alt', 'S'],
    description: 'Navigate to Scripts repository',
    actionName: 'Scripts',
  },
  {
    id: 'nav-tasks',
    category: 'NAVIGATION',
    keys: ['Alt', 'T'],
    description: 'Navigate to Tasks operational board',
    actionName: 'Tasks',
  },
  {
    id: 'nav-equipment',
    category: 'NAVIGATION',
    keys: ['Alt', 'E'],
    description: 'Navigate to Equipment inventory',
    actionName: 'Equipment',
  },
  {
    id: 'nav-reports',
    category: 'NAVIGATION',
    keys: ['Alt', 'R'],
    description: 'Navigate to Analytics & Reports',
    actionName: 'Reports',
  },
  {
    id: 'nav-calendar',
    category: 'NAVIGATION',
    keys: ['Alt', 'C'],
    description: 'Navigate to Media Calendar',
    actionName: 'Media Calendar',
  },

  // Actions & Operations
  {
    id: 'action-save',
    category: 'ACTIONS',
    keys: ['Ctrl', 'S'],
    description: 'Save active form, inspector changes or modal',
    actionName: 'Save / Submit',
  },
  {
    id: 'action-cancel',
    category: 'ACTIONS',
    keys: ['Esc'],
    description: 'Cancel active action, close modal, drawer, or clear search',
    actionName: 'Cancel / Close',
  },
  {
    id: 'action-notifications',
    category: 'ACTIONS',
    keys: ['Alt', 'N'],
    description: 'Toggle Notifications drawer',
    actionName: 'Notifications',
  },

  // System
  {
    id: 'system-help',
    category: 'SYSTEM',
    keys: ['?'],
    description: 'Show Keyboard Shortcuts Cheat Sheet',
    actionName: 'Keyboard Shortcuts Help',
  },
];

interface KeyboardShortcutsContextType {
  showHelpModal: boolean;
  setShowHelpModal: (show: boolean) => void;
  shortcuts: ShortcutDefinition[];
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType>({
  showHelpModal: false,
  setShowHelpModal: () => {},
  shortcuts: SHORTCUTS_LIST,
});

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable;

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // 1. Help Cheat Sheet: '?' key when not in an input
      if (e.key === '?' && !isInput && !ctrlOrCmd && !e.altKey) {
        e.preventDefault();
        setShowHelpModal((prev) => !prev);
        return;
      }

      // 2. Escape: Cancel / Close modals, drawers, or Help
      if (e.key === 'Escape') {
        if (showHelpModal) {
          e.preventDefault();
          setShowHelpModal(false);
          return;
        }
        window.dispatchEvent(new CustomEvent('moms:cancel'));
        return;
      }

      // 3. Save: Ctrl+S or Cmd+S
      if (ctrlOrCmd && e.key.toLowerCase() === 's' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('moms:save'));
        return;
      }

      // 4. Global Search: Ctrl+K or Cmd+K or '/' (when not typing in input)
      if (
        (ctrlOrCmd && e.key.toLowerCase() === 'k') ||
        (e.key === '/' && !isInput && !ctrlOrCmd && !e.altKey)
      ) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('moms:focus-search'));
        const searchInput = document.getElementById('global-search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // 5. Advanced Search: Ctrl+Shift+F
      if (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('moms:open-advanced-search'));
        return;
      }

      // 6. Notifications Drawer: Alt+N or Ctrl+Shift+N
      if ((e.altKey && e.key.toLowerCase() === 'n') || (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'n')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('moms:toggle-notifications'));
        return;
      }

      // 7. Quick Navigation via Alt + Key
      if (e.altKey && !ctrlOrCmd && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            router.push('/');
            break;
          case 'p':
            e.preventDefault();
            router.push('/projects');
            break;
          case 's':
            e.preventDefault();
            router.push('/scripts');
            break;
          case 't':
            e.preventDefault();
            router.push('/tasks');
            break;
          case 'e':
            e.preventDefault();
            router.push('/equipment');
            break;
          case 'r':
            e.preventDefault();
            router.push('/reports');
            break;
          case 'c':
            e.preventDefault();
            router.push('/calendar');
            break;
          default:
            break;
        }
      }
    },
    [router, showHelpModal]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        showHelpModal,
        setShowHelpModal,
        shortcuts: SHORTCUTS_LIST,
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  return useContext(KeyboardShortcutsContext);
}
