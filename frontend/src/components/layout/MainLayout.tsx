'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from '../common/Breadcrumbs';
import { BreadcrumbsProvider } from '@/lib/breadcrumbs-context';
import { FavoritesProvider } from '@/lib/favorites-context';
import { KeyboardShortcutsProvider } from '@/lib/keyboard-shortcuts-context';
import { KeyboardShortcutsModal } from '../common/KeyboardShortcutsModal';
import { useRouter, usePathname } from 'next/navigation';

export function MainLayout({
  children,
  rightUtilityPanel,
  footer,
}: {
  children: React.ReactNode;
  rightUtilityPanel?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [mounted, user, pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Prevent hydration flash
  if (!mounted || !user) {
    return null;
  }

  return (
    <KeyboardShortcutsProvider>
      <FavoritesProvider>
        <BreadcrumbsProvider>
          {/* Standard Application Layout Shell */}
          <div className="flex h-full w-full overflow-hidden bg-background text-gray-100 m-0 p-0">
            {/* 1. Left Sidebar Navigation */}
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              {/* 2. Top Navigation Bar */}
              <Header />

              {/* Breadcrumb Context Navigation */}
              <Breadcrumbs />

              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* 3. Main Content Area */}
                <main className="flex-1 p-6 overflow-y-auto min-w-0">{children}</main>

                {/* 4. Right Utility Panel (Optional) */}
                {rightUtilityPanel && (
                  <aside className="w-80 border-l border-gray-800 bg-[#0d121f] overflow-y-auto p-4 shrink-0">
                    {rightUtilityPanel}
                  </aside>
                )}
              </div>

              {/* 5. Footer / Status Bar (Optional) */}
              {footer && (
                <footer className="h-8 bg-[#090d16] border-t border-gray-800 text-xs text-gray-400 flex items-center justify-between px-4 shrink-0">
                  {footer}
                </footer>
              )}
            </div>

            <KeyboardShortcutsModal />
          </div>
        </BreadcrumbsProvider>
      </FavoritesProvider>
    </KeyboardShortcutsProvider>
  );
}
