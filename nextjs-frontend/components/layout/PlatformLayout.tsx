'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlatformSidebar from '@/components/sidebar/PlatformSidebar';
import { NotificationProvider, BackupProgressIndicator, NotificationBell } from '@/contexts/NotificationContext';
import { Toaster } from 'sonner';

interface PlatformLayoutProps {
  children: React.ReactNode;
}

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('platform_token');
    const userData = localStorage.getItem('platform_user');

    if (!token) {
      router.push('/platform/login');
      return;
    }

    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  return (
    <NotificationProvider apiUrl={apiUrl}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        <Toaster richColors position="top-right" />
        <BackupProgressIndicator />
        
        {/* Sidebar */}
        <PlatformSidebar user={user} />

        {/* Main Content */}
        <main className="lg:ml-72 min-h-screen transition-all duration-300">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Platform Administration</h1>
                <p className="text-xs text-gray-500">FlexCloud SaaS Management Console</p>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="h-8 w-px bg-gray-200" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                    {user?.name?.charAt(0) || 'A'}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {user?.name || 'Admin'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </NotificationProvider>
  );
}
