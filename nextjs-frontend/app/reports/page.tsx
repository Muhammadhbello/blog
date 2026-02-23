'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TenantLayout from '@/components/TenantLayout';
import apiClient from '@/lib/api';

interface DashboardAnalytics {
  summary: {
    total_revenue: number;
    invoice_revenue: number;
    ticket_revenue: number;
    this_month: number;
    last_month: number;
    monthly_growth: number;
  };
  daily_trend: { date: string; invoice_amount: number; ticket_amount: number; total: number }[];
  revenue_by_ward: { ward: string; amount: number }[];
  revenue_by_category: { category: string; amount: number }[];
  invoice_status: { status: string; count: number; amount: number }[];
  collector_performance: { collector: string; tickets_sold: number; amount: number }[];
  top_revenue_points: { point: string; tickets_sold: number; amount: number }[];
  business_trend: { date: string; count: number }[];
}

export default function ReportsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'tickets' | 'closings' | 'defaulters'>('overview');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchAnalytics();
    }
  }, [user, isLoading, router, dateRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.get('/reports/dashboard-analytics', {
        params: dateRange,
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount || 0);
  };

  const exportReport = async (type: string) => {
    try {
      const response = await apiClient.get('/reports/export', {
        params: { type, ...dateRange },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Export failed');
    }
  };

  if (isLoading || loading) {
    return (
      <TenantLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600 mt-1">Comprehensive revenue insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
            <p className="text-blue-100 text-sm">Total Revenue</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(analytics.summary.total_revenue)}</p>
            <div className="mt-2 flex items-center text-sm">
              <span className={analytics.summary.monthly_growth >= 0 ? 'text-green-300' : 'text-red-300'}>
                {analytics.summary.monthly_growth >= 0 ? '↑' : '↓'} {Math.abs(analytics.summary.monthly_growth)}%
              </span>
              <span className="text-blue-200 ml-2">vs last month</span>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Invoice Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.summary.invoice_revenue)}</p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(analytics.summary.invoice_revenue / analytics.summary.total_revenue) * 100}%` }}
              />
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Ticket Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.summary.ticket_revenue)}</p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${(analytics.summary.ticket_revenue / analytics.summary.total_revenue) * 100}%` }}
              />
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <p className="text-gray-500 text-sm">This Month</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.summary.this_month)}</p>
            <p className="text-xs text-gray-500 mt-2">Last month: {formatCurrency(analytics.summary.last_month)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {(['overview', 'invoices', 'tickets', 'closings', 'defaulters'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
            }`}
          >
            {tab}
          </button>
        ))}
        <button
          onClick={() => exportReport(activeTab)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-600 hover:bg-green-100 transition flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export CSV</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && analytics && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Daily Revenue Trend */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue Trend</h3>
            <div className="h-64 flex items-end space-x-1">
              {analytics.daily_trend.slice(-30).map((day, index) => (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t hover:from-blue-600 hover:to-blue-400 transition cursor-pointer"
                    style={{ 
                      height: `${Math.max((day.total / Math.max(...analytics.daily_trend.map(d => d.total))) * 200, 4)}px` 
                    }}
                    title={`${day.date}: ${formatCurrency(day.total)}`}
                  />
                  {index % 5 === 0 && (
                    <span className="text-xs text-gray-400 mt-1 transform -rotate-45 origin-top-left">
                      {new Date(day.date).getDate()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Ward */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Ward</h3>
            <div className="space-y-3">
              {analytics.revenue_by_ward.slice(0, 5).map((ward, index) => (
                <div key={ward.ward}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{ward.ward}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(ward.amount)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${(ward.amount / analytics.revenue_by_ward[0].amount) * 100}%`,
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Category */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
            <div className="space-y-3">
              {analytics.revenue_by_category.slice(0, 5).map((cat, index) => (
                <div key={cat.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{cat.category}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(cat.amount)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${(cat.amount / analytics.revenue_by_category[0].amount) * 100}%`,
                        backgroundColor: ['#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'][index]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Status */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Status Distribution</h3>
            <div className="grid grid-cols-2 gap-4">
              {analytics.invoice_status.map((status) => (
                <div key={status.status} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{status.count}</p>
                  <p className="text-sm text-gray-500 capitalize">{status.status}</p>
                  <p className="text-xs text-gray-400">{formatCurrency(status.amount)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Collectors */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Collectors</h3>
            <div className="space-y-3">
              {analytics.collector_performance.slice(0, 5).map((collector, index) => (
                <div key={collector.collector} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      ['bg-yellow-500', 'bg-gray-400', 'bg-amber-600', 'bg-blue-500', 'bg-green-500'][index]
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{collector.collector}</p>
                      <p className="text-xs text-gray-500">{collector.tickets_sold} tickets</p>
                    </div>
                  </div>
                  <span className="font-bold text-green-600">{formatCurrency(collector.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Revenue Points */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Revenue Points</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {analytics.top_revenue_points.slice(0, 5).map((point, index) => (
                <div key={point.point} className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(point.amount)}</p>
                  <p className="text-sm font-medium text-gray-700 truncate">{point.point}</p>
                  <p className="text-xs text-gray-500">{point.tickets_sold} tickets</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'overview' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 mb-4">Select date range and click Export CSV to download detailed {activeTab} report</p>
            <button
              onClick={() => exportReport(activeTab)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-lg font-semibold"
            >
              Export {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report
            </button>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
