'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import EnhancedTenantLayout from '@/components/layout/EnhancedTenantLayout';
import apiClient from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';

// Animated Counter Component
const AnimatedCounter = ({ 
  value, 
  prefix = '', 
  suffix = '',
  duration = 2000,
  decimals = 0 
}: { 
  value: number; 
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const countRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = countRef.current;
    const endValue = value;
    const diff = endValue - startValue;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + diff * easeProgress;
      
      setDisplayValue(currentValue);
      countRef.current = currentValue;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = null;
    requestAnimationFrame(animate);
  }, [value, duration]);

  const formattedValue = decimals > 0 
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toLocaleString('en-NG');

  return <span>{prefix}{formattedValue}{suffix}</span>;
};

// Skeleton Loader Component
const SkeletonCard = () => (
  <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-3 flex-1">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-8 bg-gray-200 rounded w-36"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
    </div>
  </div>
);

// Mini Sparkline Chart
const Sparkline = ({ data, color = '#3b82f6' }: { data: number[]; color?: string }) => {
  if (!data || data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 30;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="3"
        fill={color}
      />
    </svg>
  );
};

// Progress Ring Component
const ProgressRing = ({ 
  percentage, 
  size = 60, 
  strokeWidth = 6,
  color = '#3b82f6'
}: { 
  percentage: number; 
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
};

interface DashboardStats {
  total_revenue: number;
  total_transactions: number;
  platform_fees: number;
  gross_revenue: number;
  active_businesses: number;
  pending_invoices: number;
  overdue_invoices: number;
  tickets_sold_today: number;
  collection_rate: number;
  revenue_by_category: Array<{ name: string; total: string }>;
  daily_revenue: number[];
  weekly_trend: number;
}

export default function EnterpriseDashboard() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'comfortable' | 'compact'>('comfortable');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchDashboardData();
      // Poll every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, isLoading, router]);

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      const newStats = response.data;
      
      // Check for revenue increase
      if (stats && newStats.total_revenue > stats.total_revenue) {
        const increase = newStats.total_revenue - stats.total_revenue;
        toast.success('💰 New Revenue!', {
          description: `+₦${increase.toLocaleString('en-NG')}`,
        });
      }
      
      setStats(newStats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading || !user) {
    return (
      <TenantLayout>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout>
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue Command Center</h1>
          <p className="text-gray-500 mt-1">
            Real-time intelligence for {user.tenant?.name || 'Your LGA'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Live Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-700">Live</span>
          </div>
          
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('comfortable')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                viewMode === 'comfortable' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                viewMode === 'compact' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Compact
            </button>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={fetchDashboardData}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Refresh data"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bento Grid - Main Stats */}
          <div className={`grid gap-6 ${
            viewMode === 'compact' 
              ? 'grid-cols-2 lg:grid-cols-4' 
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}>
            {/* Total Net Revenue - Large Card */}
            <div className={`${viewMode === 'compact' ? '' : 'lg:col-span-2 lg:row-span-2'} group`}>
              <div className="h-full bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] rounded-3xl p-6 text-white relative overflow-hidden hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-blue-100 text-sm font-medium">Net Revenue (LGA)</p>
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  <p className={`font-bold ${viewMode === 'compact' ? 'text-2xl' : 'text-4xl lg:text-5xl'} mb-2`}>
                    <AnimatedCounter 
                      value={stats?.total_revenue || 0} 
                      prefix="₦" 
                    />
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-blue-200">After {((stats?.platform_fees || 0) / (stats?.gross_revenue || 1) * 100).toFixed(1)}% platform fee</span>
                    {stats?.weekly_trend !== undefined && (
                      <span className={`flex items-center gap-1 ${stats.weekly_trend >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {stats.weekly_trend >= 0 ? '↑' : '↓'}
                        {Math.abs(stats.weekly_trend)}% vs last week
                      </span>
                    )}
                  </div>
                  
                  {viewMode !== 'compact' && stats?.daily_revenue && (
                    <div className="mt-6">
                      <Sparkline data={stats.daily_revenue} color="#93c5fd" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gross Revenue */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-500 text-sm font-medium">Gross Revenue</p>
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter value={stats?.gross_revenue || 0} prefix="₦" />
                </p>
                <p className="text-xs text-gray-400 mt-1">Total before deductions</p>
              </div>
            </div>

            {/* Platform Fees */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-500 text-sm font-medium">Platform Fees</p>
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter value={stats?.platform_fees || 0} prefix="₦" />
                </p>
                <p className="text-xs text-gray-400 mt-1">FlexCloud revenue share</p>
              </div>
            </div>

            {/* Transactions */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-500 text-sm font-medium">Transactions</p>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter value={stats?.total_transactions || 0} />
                </p>
                <p className="text-xs text-gray-400 mt-1">This month</p>
              </div>
            </div>

            {/* Active Businesses */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-500 text-sm font-medium">Active Businesses</p>
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter value={stats?.active_businesses || 0} />
                </p>
                <p className="text-xs text-gray-400 mt-1">Registered & active</p>
              </div>
            </div>

            {/* Collection Rate */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-3">Collection Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      <AnimatedCounter value={stats?.collection_rate || 0} suffix="%" decimals={1} />
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Invoice payment rate</p>
                  </div>
                  <ProgressRing 
                    percentage={stats?.collection_rate || 0} 
                    color={stats?.collection_rate && stats.collection_rate > 70 ? '#10b981' : '#f59e0b'}
                  />
                </div>
              </div>
            </div>

            {/* Pending Invoices */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-500 text-sm font-medium">Pending Invoices</p>
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter value={stats?.pending_invoices || 0} />
                </p>
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  {stats?.overdue_invoices || 0} overdue
                </p>
              </div>
            </div>

            {/* Tickets Sold Today */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-500 text-sm font-medium">Tickets Today</p>
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter value={stats?.tickets_sold_today || 0} />
                </p>
                <p className="text-xs text-gray-400 mt-1">Sold today</p>
              </div>
            </div>
          </div>

          {/* Revenue by Category */}
          {stats?.revenue_by_category && stats.revenue_by_category.length > 0 && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Revenue by Category</h3>
                <Link href="/analytics" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View Details →
                </Link>
              </div>
              <div className="space-y-4">
                {stats.revenue_by_category.slice(0, 5).map((category, index) => {
                  const total = parseFloat(category.total);
                  const maxTotal = Math.max(...stats.revenue_by_category.map(c => parseFloat(c.total)));
                  const percentage = (total / maxTotal) * 100;
                  
                  return (
                    <div key={index} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{category.name}</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(total)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/businesses" className="group p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-200 transition">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900">Businesses</p>
              <p className="text-xs text-gray-500 mt-1">Register & manage</p>
            </Link>

            <Link href="/invoices" className="group p-5 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 hover:border-green-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-200 transition">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900">Invoices</p>
              <p className="text-xs text-gray-500 mt-1">Generate & track</p>
            </Link>

            <Link href="/tickets" className="group p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 hover:border-purple-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-200 transition">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900">Ticketing</p>
              <p className="text-xs text-gray-500 mt-1">Field collections</p>
            </Link>

            <Link href="/reports" className="group p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 hover:border-orange-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-200 transition">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900">Reports</p>
              <p className="text-xs text-gray-500 mt-1">Analytics & insights</p>
            </Link>
          </div>

          {/* Last Update */}
          {lastUpdate && (
            <p className="text-center text-xs text-gray-400">
              Last updated: {lastUpdate.toLocaleTimeString('en-NG')}
            </p>
          )}
        </div>
      )}
    </TenantLayout>
  );
}
