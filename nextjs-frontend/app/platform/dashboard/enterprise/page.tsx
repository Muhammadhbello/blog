'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import Link from 'next/link';

interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_gross_revenue: number;
  total_platform_revenue: number;
  total_tenant_net: number;
  total_transactions: number;
  monthly_growth: number;
  tenant_breakdown: Array<{
    id: number;
    name: string;
    slug: string;
    gross: number;
    platform_fee: number;
    net_tenant: number;
    transactions: number;
    status: string;
  }>;
  revenue_by_day: Array<{
    date: string;
    gross: number;
    platform_fee: number;
  }>;
}

// Animated Counter
const AnimatedCounter = ({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{prefix}{Math.round(display).toLocaleString('en-NG')}{suffix}</span>;
};

export default function PlatformDashboard() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/platform/login');
    } else if (user && user.role === 'platform_admin') {
      fetchStats();
    }
  }, [user, isLoading, router, dateRange]);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/platform/dashboard/stats', {
        params: { range: dateRange }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch platform stats', error);
      // Mock data for demonstration
      setStats({
        total_tenants: 12,
        active_tenants: 10,
        suspended_tenants: 2,
        total_gross_revenue: 45678900,
        total_platform_revenue: 2283945,
        total_tenant_net: 43394955,
        total_transactions: 3456,
        monthly_growth: 12.5,
        tenant_breakdown: [
          { id: 1, name: 'Potiskum LGA', slug: 'potiskum', gross: 12500000, platform_fee: 625000, net_tenant: 11875000, transactions: 890, status: 'active' },
          { id: 2, name: 'Damaturu LGA', slug: 'damaturu', gross: 9800000, platform_fee: 490000, net_tenant: 9310000, transactions: 654, status: 'active' },
          { id: 3, name: 'Bade LGA', slug: 'bade', gross: 7600000, platform_fee: 380000, net_tenant: 7220000, transactions: 432, status: 'active' },
          { id: 4, name: 'Nguru LGA', slug: 'nguru', gross: 6200000, platform_fee: 310000, net_tenant: 5890000, transactions: 389, status: 'active' },
          { id: 5, name: 'Geidam LGA', slug: 'geidam', gross: 4500000, platform_fee: 225000, net_tenant: 4275000, transactions: 278, status: 'active' },
        ],
        revenue_by_day: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">F</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">FlexCloud Platform</h1>
              <p className="text-xs text-purple-300">Super Admin Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Date Range Selector */}
            <div className="flex bg-white/10 rounded-lg p-1">
              {(['today', 'week', 'month', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition capitalize ${
                    dateRange === range
                      ? 'bg-white text-purple-900'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            
            <Link
              href="/platform/tenants"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition"
            >
              Manage Tenants
            </Link>
            
            <button
              onClick={logout}
              className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : stats && (
          <div className="space-y-8">
            {/* Hero Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Platform Revenue - Hero Card */}
              <div className="lg:col-span-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-purple-300 text-sm font-medium mb-2">Platform Revenue (5% Share)</p>
                    <p className="text-5xl font-bold text-white mb-2">
                      <AnimatedCounter value={stats.total_platform_revenue} prefix="₦" />
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`flex items-center gap-1 ${stats.monthly_growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stats.monthly_growth >= 0 ? '↑' : '↓'}
                        {Math.abs(stats.monthly_growth)}%
                      </span>
                      <span className="text-purple-300">vs last {dateRange}</span>
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-purple-300 text-xs mb-1">Gross Revenue (All Tenants)</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.total_gross_revenue)}</p>
                  </div>
                  <div>
                    <p className="text-purple-300 text-xs mb-1">Tenant Net Revenue</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.total_tenant_net)}</p>
                  </div>
                </div>
              </div>

              {/* Tenant Stats */}
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4">Tenant Overview</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-emerald-400 font-bold">{stats.active_tenants}</span>
                      </div>
                      <span className="text-gray-300 text-sm">Active Tenants</span>
                    </div>
                    <span className="text-emerald-400 text-xs">Online</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-amber-400 font-bold">{stats.suspended_tenants}</span>
                      </div>
                      <span className="text-gray-300 text-sm">Suspended</span>
                    </div>
                    <span className="text-amber-400 text-xs">Review</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-blue-400 font-bold">{stats.total_transactions.toLocaleString()}</span>
                      </div>
                      <span className="text-gray-300 text-sm">Transactions</span>
                    </div>
                    <span className="text-blue-400 text-xs">This {dateRange}</span>
                  </div>
                </div>
                
                <Link
                  href="/platform/tenants/new"
                  className="mt-4 w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add New Tenant
                </Link>
              </div>
            </div>

            {/* Revenue Share Breakdown */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">Revenue by Tenant</h3>
                <Link href="/platform/revenue" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
                  View All →
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-purple-300 border-b border-white/10">
                      <th className="pb-3 font-medium">Tenant</th>
                      <th className="pb-3 font-medium text-right">Gross Revenue</th>
                      <th className="pb-3 font-medium text-right">Platform Fee (5%)</th>
                      <th className="pb-3 font-medium text-right">Net to Tenant</th>
                      <th className="pb-3 font-medium text-right">Transactions</th>
                      <th className="pb-3 font-medium text-center">Status</th>
                      <th className="pb-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {stats.tenant_breakdown.map((tenant) => (
                      <tr key={tenant.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-4">
                          <div>
                            <p className="text-white font-medium">{tenant.name}</p>
                            <p className="text-purple-400 text-xs">{tenant.slug}.flexcloud.ng</p>
                          </div>
                        </td>
                        <td className="py-4 text-right text-white font-medium">
                          {formatCurrency(tenant.gross)}
                        </td>
                        <td className="py-4 text-right text-purple-400">
                          {formatCurrency(tenant.platform_fee)}
                        </td>
                        <td className="py-4 text-right text-emerald-400">
                          {formatCurrency(tenant.net_tenant)}
                        </td>
                        <td className="py-4 text-right text-gray-300">
                          {tenant.transactions.toLocaleString()}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tenant.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {tenant.status}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/platform/tenants/${tenant.id}/impersonate`}
                              className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition"
                            >
                              Enter Portal
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Revenue Share Model Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/20">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">💰</span>
                </div>
                <h4 className="text-white font-semibold mb-2">Percentage Model</h4>
                <p className="text-sm text-gray-400 mb-3">
                  Standard 5% of all revenue collected through the platform.
                </p>
                <p className="text-2xl font-bold text-emerald-400">5%</p>
                <p className="text-xs text-gray-500">Per transaction</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/20">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h4 className="text-white font-semibold mb-2">Tiered Model</h4>
                <p className="text-sm text-gray-400 mb-3">
                  Lower rates for higher volume tenants.
                </p>
                <p className="text-2xl font-bold text-blue-400">3-7%</p>
                <p className="text-xs text-gray-500">Based on volume</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h4 className="text-white font-semibold mb-2">Flat Model</h4>
                <p className="text-sm text-gray-400 mb-3">
                  Fixed monthly fee regardless of revenue.
                </p>
                <p className="text-2xl font-bold text-purple-400">₦50K</p>
                <p className="text-xs text-gray-500">Per month</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
