'use client';

import React, { useState, useEffect } from 'react';
import { PlatformLayout } from '@/components/PlatformLayout';
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  CreditCard, 
  Users, 
  DollarSign,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  RefreshCw,
  Download,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import apiClient from '@/lib/api';

interface TenantData {
  id: number;
  name: string;
  slug: string;
  status: string;
  gross: number;
  platform_fee: number;
  net_tenant: number;
  transactions: number;
  businesses_count: number;
  users_count: number;
}

interface DashboardStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_gross_revenue: number;
  total_platform_revenue: number;
  total_tenant_net: number;
  total_transactions: number;
  monthly_growth: number;
  tenant_breakdown: TenantData[];
  top_tenants: TenantData[];
  revenue_by_day: { date: string; gross: number; platform_fee: number; transactions: number }[];
  revenue_by_category: { category: string; total: number; count: number }[];
  date_range: { start: string; end: string; label: string };
}

export default function PlatformAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('month');
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const response = await apiClient.get(`/api/platform/analytics/dashboard?range=${range}`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [range]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <PlatformLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="text-gray-500">Comprehensive revenue and performance insights</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <div className="relative">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            
            <button
              onClick={fetchStats}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics - Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Gross Revenue */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className={`flex items-center gap-1 text-sm font-medium ${(stats?.monthly_growth ?? 0) >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {(stats?.monthly_growth ?? 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(stats?.monthly_growth ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(stats?.total_gross_revenue ?? 0)}</div>
            <div className="text-blue-100 text-sm">Total Gross Revenue</div>
          </div>

          {/* Platform Revenue */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <CreditCard className="h-5 w-5" />
              </div>
              <span className="text-emerald-200 text-sm font-medium">Platform Share</span>
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(stats?.total_platform_revenue ?? 0)}</div>
            <div className="text-emerald-100 text-sm">Platform Earnings</div>
          </div>

          {/* Active Tenants */}
          <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-violet-200 text-sm font-medium">{stats?.suspended_tenants ?? 0} suspended</span>
            </div>
            <div className="text-3xl font-bold mb-1">{stats?.active_tenants ?? 0}/{stats?.total_tenants ?? 0}</div>
            <div className="text-violet-100 text-sm">Active Tenants</div>
          </div>

          {/* Total Transactions */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-amber-200 text-sm font-medium">This {range}</span>
            </div>
            <div className="text-3xl font-bold mb-1">{formatNumber(stats?.total_transactions ?? 0)}</div>
            <div className="text-amber-100 text-sm">Total Transactions</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
                <p className="text-sm text-gray-500">Daily revenue breakdown</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">Gross</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-gray-600">Platform Fee</span>
                </div>
              </div>
            </div>
            
            {/* Simple bar chart representation */}
            <div className="h-64 flex items-end gap-1">
              {stats?.revenue_by_day?.slice(-14).map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col gap-0.5">
                    <div 
                      className="w-full bg-blue-500 rounded-t"
                      style={{ 
                        height: `${Math.max(4, (day.gross / (Math.max(...(stats?.revenue_by_day?.map(d => d.gross) || [1])) || 1)) * 150)}px` 
                      }}
                    ></div>
                    <div 
                      className="w-full bg-emerald-500 rounded-b"
                      style={{ 
                        height: `${Math.max(2, (day.platform_fee / (Math.max(...(stats?.revenue_by_day?.map(d => d.gross) || [1])) || 1)) * 150)}px` 
                      }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-gray-400 truncate w-full text-center">
                    {new Date(day.date).getDate()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Category */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">By Category</h3>
                <p className="text-sm text-gray-500">Revenue distribution</p>
              </div>
              <PieChart className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {stats?.revenue_by_category?.slice(0, 5).map((cat, i) => {
                const maxTotal = Math.max(...(stats?.revenue_by_category?.map(c => c.total) || [1]));
                const percentage = ((cat.total / (stats?.total_gross_revenue || 1)) * 100).toFixed(1);
                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
                
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                      <span className="text-sm text-gray-500">{percentage}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                        style={{ width: `${(cat.total / maxTotal) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400">{formatCurrency(cat.total)}</div>
                  </div>
                );
              })}
              
              {(!stats?.revenue_by_category || stats.revenue_by_category.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No category data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tenant Performance Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tenant Performance</h3>
                <p className="text-sm text-gray-500">Revenue breakdown by tenant</p>
              </div>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Platform Fee</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Revenue</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Businesses</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats?.tenant_breakdown?.map((tenant, i) => (
                  <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                          {tenant.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{tenant.name}</div>
                          <div className="text-xs text-gray-500">{tenant.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-gray-900">{formatCurrency(tenant.gross)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-emerald-600 font-medium">{formatCurrency(tenant.platform_fee)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-gray-700">{formatCurrency(tenant.net_tenant)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {formatNumber(tenant.transactions)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-gray-600">{tenant.businesses_count}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        tenant.status === 'active' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {tenant.status}
                      </span>
                    </td>
                  </tr>
                ))}
                
                {(!stats?.tenant_breakdown || stats.tenant_breakdown.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No tenant data available</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats?.top_tenants?.map((tenant, i) => (
            <div key={tenant.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-blue-500'
                }`}>
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{tenant.name}</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(tenant.gross)}</div>
              <div className="text-xs text-gray-500">{tenant.transactions} transactions</div>
            </div>
          ))}
        </div>
      </div>
    </PlatformLayout>
  );
}
