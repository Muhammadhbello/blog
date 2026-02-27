'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  PieChart,
  Store,
  Tags,
  FileText,
  Scale,
  Ticket,
  ClipboardCheck,
  MapPin,
  Users,
  UserCheck,
  Trophy,
  Briefcase,
  Map,
  Key,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  Plug,
  MessageSquare,
  ShieldCheck,
  UserCog,
  ChevronDown,
  ChevronRight,
  Bell,
  LogOut,
  Menu,
  X,
  Wallet,
  Building,
  BarChart3,
  Settings,
} from 'lucide-react';

interface MenuItem {
  label: string;
  icon: any;
  href: string;
  roles?: string[];
  badge?: number | string;
  badgeColor?: string;
}

interface MenuGroup {
  title: string;
  icon?: any;
  items: MenuItem[];
  defaultOpen?: boolean;
  roles?: string[];
}

const tenantMenuGroups: MenuGroup[] = [
  {
    title: 'Overview',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { label: 'Command Center', icon: LayoutDashboard, href: '/dashboard/enterprise' },
      { label: 'Analytics', icon: PieChart, href: '/analytics', roles: ['chairman', 'treasurer', 'lga_admin'] },
    ],
  },
  {
    title: 'Revenue Ops',
    icon: Store,
    defaultOpen: true,
    items: [
      { label: 'Business Registry', icon: Store, href: '/businesses' },
      { label: 'Business Categories', icon: Tags, href: '/categories' },
      { label: 'Invoices', icon: FileText, href: '/invoices' },
      { label: 'Bulk Invoicing', icon: FileText, href: '/invoices/bulk', roles: ['chairman', 'treasurer', 'lga_admin'] },
      { label: 'Tariffs & Pricing', icon: Scale, href: '/revenue-items' },
    ],
  },
  {
    title: 'Field Operations',
    icon: Ticket,
    items: [
      { label: 'Ticketing (POS)', icon: Ticket, href: '/tickets' },
      { label: 'Closings', icon: ClipboardCheck, href: '/closings', badge: 3, badgeColor: 'orange' },
      { label: 'Revenue Points', icon: MapPin, href: '/revenue-points' },
      { label: 'Offline Sync', icon: RefreshCw, href: '/offline-sync' },
    ],
  },
  {
    title: 'Workforce',
    icon: Users,
    items: [
      { label: 'Consultants', icon: Users, href: '/consultants' },
      { label: 'Collectors', icon: UserCheck, href: '/collectors' },
      { label: 'Assignments', icon: UserCheck, href: '/assignments' },
      { label: 'Performance', icon: Trophy, href: '/performance', roles: ['chairman', 'treasurer', 'lga_admin'] },
    ],
  },
  {
    title: 'Organization',
    icon: Building,
    items: [
      { label: 'Departments', icon: Briefcase, href: '/departments' },
      { label: 'Wards', icon: Map, href: '/wards' },
      { label: 'User Management', icon: Key, href: '/admin/users', roles: ['chairman', 'lga_admin'] },
      { label: 'Roles & Permissions', icon: ShieldCheck, href: '/admin/roles', roles: ['chairman', 'lga_admin'] },
    ],
  },
  {
    title: 'Finance',
    icon: CreditCard,
    roles: ['chairman', 'treasurer', 'lga_admin', 'auditor_finance'],
    items: [
      { label: 'Transactions', icon: CreditCard, href: '/payments' },
      { label: 'Reconciliation', icon: RefreshCw, href: '/reconcile' },
      { label: 'Defaulters', icon: AlertTriangle, href: '/defaulters', badge: 12, badgeColor: 'red' },
    ],
  },
  {
    title: 'Reports',
    icon: BarChart3,
    roles: ['chairman', 'treasurer', 'lga_admin', 'auditor_finance', 'hod'],
    items: [
      { label: 'Variance Report', icon: AlertTriangle, href: '/reports/variance' },
      { label: 'Financial Statements', icon: FileSpreadsheet, href: '/reports/financial' },
      { label: 'All Reports', icon: BarChart3, href: '/reports' },
    ],
  },
  {
    title: 'Settings',
    icon: Settings,
    roles: ['chairman', 'treasurer', 'lga_admin'],
    items: [
      { label: 'Integrations', icon: Plug, href: '/settings/integrations' },
      { label: 'Message Templates', icon: MessageSquare, href: '/settings/templates' },
      { label: 'Payment Gateways', icon: Plug, href: '/settings/payment' },
      { label: 'SMS & Messaging', icon: MessageSquare, href: '/settings/sms' },
      { label: 'Email Settings', icon: MessageSquare, href: '/settings/email' },
      { label: 'Audit Trail', icon: ShieldCheck, href: '/settings/audit' },
      { label: 'Profile', icon: UserCog, href: '/settings/profile' },
    ],
  },
];

// Consultant-specific menu (simplified view)
const consultantMenuGroups: MenuGroup[] = [
  {
    title: 'My Portal',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/consultant-portal' },
      { label: 'My Assignments', icon: MapPin, href: '/consultant-portal/assignments' },
      { label: 'Issue Ticket', icon: Ticket, href: '/consultant-portal/pos' },
      { label: 'Submit Closing', icon: ClipboardCheck, href: '/consultant-portal/closing' },
      { label: 'My Wallet', icon: Wallet, href: '/consultant-portal/wallet' },
      { label: 'My Reports', icon: BarChart3, href: '/consultant-portal/reports' },
    ],
  },
];

interface TenantSidebarProps {
  user?: {
    name: string;
    email: string;
    role: string;
  };
  tenant?: {
    name: string;
    logo_url?: string;
  };
  isImpersonating?: boolean;
}

export default function TenantSidebar({ user, tenant, isImpersonating }: TenantSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Overview', 'Revenue Ops']);
  const [pendingClosings, setPendingClosings] = useState(0);
  const [pendingDefaulters, setPendingDefaulters] = useState(0);

  const userRole = user?.role || 'staff';
  const isConsultantView = ['consultant', 'collector'].includes(userRole);

  // Use consultant menu for consultant/collector roles
  const menuGroups = isConsultantView ? consultantMenuGroups : tenantMenuGroups;

  useEffect(() => {
    // Initialize expanded groups
    setExpandedGroups(menuGroups.filter(g => g.defaultOpen).map(g => g.title));
  }, [userRole]);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('login_type');
    router.push('/login');
  };

  const canViewGroup = (group: MenuGroup): boolean => {
    if (!group.roles) return true;
    return group.roles.includes(userRole);
  };

  const canViewItem = (item: MenuItem): boolean => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  };

  const SidebarContent = () => (
    <>
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-amber-500 text-white text-xs font-medium text-center py-2 px-4">
          <span className="flex items-center justify-center gap-2">
            <ShieldCheck size={14} />
            Viewing as Platform Admin
          </span>
        </div>
      )}

      {/* Logo Area */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200/50">
        <Link href={isConsultantView ? '/consultant-portal' : '/dashboard/enterprise'} className="flex items-center gap-3">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-600/30">
              {tenant?.name?.charAt(0) || 'F'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-lg font-bold text-gray-900 truncate block">
              {tenant?.name || 'FlexCloud'}
            </span>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
              {isConsultantView ? 'Consultant Portal' : 'Tenant Portal'}
            </p>
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
        {menuGroups.map((group) => {
          if (!canViewGroup(group)) return null;

          const isExpanded = expandedGroups.includes(group.title);
          const visibleItems = group.items.filter(canViewItem);
          if (visibleItems.length === 0) return null;

          const hasActiveItem = visibleItems.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));

          return (
            <div key={group.title} className="mb-1">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                  hasActiveItem
                    ? "bg-teal-50/50 text-teal-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                )}
              >
                <div className="flex items-center gap-3">
                  {group.icon && (
                    <group.icon
                      size={16}
                      strokeWidth={1.5}
                      className={hasActiveItem ? "text-teal-600" : "text-gray-400"}
                    />
                  )}
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
                <ul className="mt-1 ml-4 space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const badge = item.label === 'Closings' ? pendingClosings || item.badge : 
                                  item.label === 'Defaulters' ? pendingDefaulters || item.badge : 
                                  item.badge;

                    return (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                            isActive
                              ? "bg-gradient-to-r from-teal-50 to-blue-50/50 text-teal-700 shadow-sm"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-teal-600 rounded-r-full" />
                          )}
                          <item.icon
                            size={18}
                            strokeWidth={1.5}
                            className={cn(
                              "transition-colors flex-shrink-0",
                              isActive ? "text-teal-600" : "text-gray-400 group-hover:text-gray-600"
                            )}
                          />
                          <span className="flex-1">{item.label}</span>
                          {badge && (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold",
                              item.badgeColor === 'red'
                                ? "bg-red-100 text-red-600"
                                : item.badgeColor === 'orange'
                                ? "bg-orange-100 text-orange-600"
                                : "bg-teal-100 text-teal-600"
                            )}>
                              {badge}
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

      {/* Quick Actions for Field Staff */}
      {isConsultantView && (
        <div className="px-4 py-3 border-t border-gray-100">
          <Link
            href="/consultant-portal/pos"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-teal-600/30 hover:shadow-xl transition-all"
          >
            <Ticket size={18} />
            <span>Quick Sell Ticket</span>
          </Link>
        </div>
      )}

      {/* Notification Bell */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
          <Bell size={18} strokeWidth={1.5} className="text-gray-400" />
          <span>Notifications</span>
          <span className="ml-auto bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
            5
          </span>
        </button>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-gray-50/50 to-white/50">
        <div className="flex items-center gap-3 px-2">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md",
            isConsultantView
              ? "bg-gradient-to-br from-teal-500 to-blue-600"
              : "bg-gradient-to-br from-blue-600 to-indigo-600"
          )}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{userRole.replace('_', ' ')}</p>
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

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </>
  );
}
