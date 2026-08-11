'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useRouter, usePathname } from 'next/navigation';

export function MainLayout({ children }: { children: React.ReactNode }) {
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
    <div className="flex h-full w-full overflow-hidden bg-background text-gray-100 m-0 p-0">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
