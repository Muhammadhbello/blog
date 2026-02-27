'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  UserPlus,
  Coins,
  Wallet,
  DatabaseBackup,
  ShieldCheck,
  Settings,
  LifeBuoy,
  ChevronDown,
  ChevronRight,
  Globe,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface MenuItem {
  label: string;
  icon: any;
  href: string;
  badge?: number | string;
  badgeColor?: string;
}

interface MenuGroup {
  title: string;
  icon?: any;
  items: MenuItem[];
  defaultOpen?: boolean;
}

const platformMenuGroups: MenuGroup[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { label: 'Overview', icon: LayoutDashboard, href: '/platform/dashboard/enterprise' },
      { label: 'Analytics', icon: BarChart3, href: '/platform/analytics' },
    ],
  },
  {
    title: 'Tenants',
    icon: Building2,
    defaultOpen: true,
    items: [
      { label: 'All Tenants', icon: Building2, href: '/platform/tenants' },
      { label: 'Onboarding', icon: UserPlus, href: '/platform/onboarding', badge: 2, badgeColor: 'blue' },
    ],
  },
  {
    title: 'Finance',
    icon: Coins,
    items: [
      { label: 'Revenue Share', icon: Coins, href: '/platform/revenue-share' },
      { label: 'Payouts', icon: Wallet, href: '/platform/payouts' },
    ],
  },
  {
    title: 'System',
    icon: Settings,
    items: [
      { label: 'Backups & Restore', icon: DatabaseBackup, href: '/platform/backups' },
      { label: 'Custom Domains', icon: Globe, href: '/platform/domains' },
      { label: 'Audit Logs', icon: ShieldCheck, href: '/platform/audit-logs' },
      { label: 'Platform Users', icon: Users, href: '/platform/users' },
      { label: 'Settings', icon: Settings, href: '/platform/settings' },
    ],
  },
  {
    title: 'Support',
    icon: LifeBuoy,
    items: [
      { label: 'Support Tickets', icon: LifeBuoy, href: '/platform/support', badge: 5, badgeColor: 'orange' },
    ],
  },
];

interface PlatformSidebarProps {
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export default function PlatformSidebar({ user }: PlatformSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    platformMenuGroups.filter(g => g.defaultOpen).map(g => g.title)
  );

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('platform_token');
    localStorage.removeItem('platform_user');
    router.push('/platform/login');
  };

  const SidebarContent = () => (
    <>
      {/* Logo Area */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200/50">
        <Link href="/platform/dashboard/enterprise" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-600/30">
            F
          </div>
          <div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-700">
              FlexCloud
            </span>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Platform Admin</p>
          </div>
        </Link>
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      {/* Scrollable Nav */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {platformMenuGroups.map((group) => {
          const isExpanded = expandedGroups.includes(group.title);
          const hasActiveItem = group.items.some(item => pathname === item.href);

          return (
            <div key={group.title} className="mb-2">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                  hasActiveItem
                    ? "bg-blue-50/50 text-blue-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                )}
              >
                <div className="flex items-center gap-3">
                  {group.icon && <group.icon size={16} className={hasActiveItem ? "text-blue-600" : "text-gray-400"} />}
                  <span className="uppercase tracking-wider text-xs">{group.title}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown size={14} className="text-gray-400" />
                ) : (
                  <ChevronRight size={14} className="text-gray-400" />
                )}
              </button>

              {/* Group Items */}
              {isExpanded && (
                <ul className="mt-1 ml-4 space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                            isActive
                              ? "bg-gradient-to-r from-blue-50 to-indigo-50/50 text-blue-700 shadow-sm"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                          )}
                          <item.icon
                            size={18}
                            strokeWidth={1.5}
                            className={cn(
                              "transition-colors flex-shrink-0",
                              isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                            )}
                          />
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold",
                              item.badgeColor === 'orange'
                                ? "bg-orange-100 text-orange-600"
                                : item.badgeColor === 'red'
                                ? "bg-red-100 text-red-600"
                                : "bg-blue-100 text-blue-600"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Notification Bell */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
          <Bell size={18} strokeWidth={1.5} className="text-gray-400" />
          <span>Notifications</span>
          <span className="ml-auto bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
            3
          </span>
        </button>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-gray-50/50 to-white/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Platform Admin'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@flexcloud.ng'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-50 rounded-lg group transition-colors"
            title="Logout"
          >
            <LogOut size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50"
      >
        <Menu size={24} className="text-gray-700" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-72 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-xl shadow-gray-200/20 z-50 flex flex-col transition-transform duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
