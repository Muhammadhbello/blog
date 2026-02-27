'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantSidebar from '@/components/sidebar/TenantSidebar';
import { NotificationProvider, BackupProgressIndicator, NotificationBell } from '@/contexts/NotificationContext';
import { Toaster } from 'sonner';
import { ShieldCheck } from 'lucide-react';

interface EnhancedTenantLayoutProps {
  children: React.ReactNode;
}

export default function EnhancedTenantLayout({ children }: EnhancedTenantLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const tenantData = localStorage.getItem('tenant');
    const impersonating = localStorage.getItem('is_impersonating') === 'true';

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }

    if (tenantData) {
      try {
        setTenant(JSON.parse(tenantData));
      } catch (e) {
        console.error('Failed to parse tenant data');
      }
    }

    setIsImpersonating(impersonating);
    setLoading(false);
  }, [router]);

  const exitImpersonation = () => {
    localStorage.removeItem('is_impersonating');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    const platformToken = localStorage.getItem('platform_token');
    if (platformToken) {
      router.push('/platform/tenants');
    } else {
      router.push('/platform/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-teal-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
          <p className="text-gray-500 text-sm">Loading portal...</p>
        </div>
      </div>
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  return (
    <NotificationProvider apiUrl={apiUrl}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-teal-50">
        <Toaster richColors position="top-right" />
        <BackupProgressIndicator />
        
        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} />
                <span>You are viewing as Platform Admin in {tenant?.name || 'Tenant'} portal</span>
              </div>
              <button
                onClick={exitImpersonation}
                className="px-4 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-xs font-bold"
              >
                Exit Impersonation
              </button>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <TenantSidebar
          user={user}
          tenant={tenant}
          isImpersonating={isImpersonating}
        />

        {/* Main Content */}
        <main className={`lg:ml-72 min-h-screen transition-all duration-300 ${isImpersonating ? 'pt-10' : ''}`}>
          {/* Top Header Bar */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{tenant?.name || 'Tenant Portal'}</h1>
                <p className="text-xs text-gray-500">Revenue Management System</p>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="h-8 w-px bg-gray-200" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-700">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ') || 'Staff'}</p>
                  </div>
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
