import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MOMS - Media Operations Management System',
  description: 'Internal operational single source of truth for media production management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full w-full m-0 p-0 overflow-hidden">
      <body className="h-full w-full m-0 p-0 overflow-hidden bg-[#f8fafc] text-slate-800 antialiased">
        <AuthProvider>
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
