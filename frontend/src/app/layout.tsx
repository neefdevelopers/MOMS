import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';

export const metadata = {
  title: 'MOMS - Media Operations Management System',
  description: 'Internal operational single source of truth for media production management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full w-full m-0 p-0 overflow-hidden">
      <body className="h-full w-full m-0 p-0 overflow-hidden bg-[#0b0f19]">
        <AuthProvider>
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
