'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeStats } from '@/hooks/useRealtimeStats';
import apiClient from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const fetchStats = async () => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  };

  const { data: stats, loading: loadingStats, refetch } = useRealtimeStats(
    fetchStats,
    {
      enabled: !!user,
      interval: 5000, // Poll every 5 seconds
      onUpdate: (newStats, previousStats) => {
        // Check if revenue increased
        if (newStats.total_revenue > previousStats.total_revenue) {
          const increase = newStats.total_revenue - previousStats.total_revenue;
          toast.success('💰 New Payment Received!', {
            description: `Revenue increased by ${formatCurrency(increase)}`,
            duration: 5000,
          });
        }
        
        // Check if transaction count increased
        if (newStats.total_transactions > previousStats.total_transactions) {
          const newTransactions = newStats.total_transactions - previousStats.total_transactions;
          if (newTransactions > 0) {
            toast.info('📊 Dashboard Updated', {
              description: `${newTransactions} new transaction${newTransactions > 1 ? 's' : ''} recorded`,
              duration: 3000,
            });
          }
        }
      },
    }
  );

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FlexCloud
              </h1>
              <span className="ml-4 px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                {user.tenant?.name || 'Super Admin'}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Real-time Indicator */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-full border border-green-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs font-medium text-green-700">Live Updates</span>
              </div>
              
              {/* Manual Refresh Button */}
              <button
                onClick={() => refetch()}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Refresh dashboard"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-600">Revenue Intelligence Command Center</p>
        </div>

        {loadingStats ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Revenue */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue (LGA)</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatCurrency(stats?.total_revenue || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">After 5% platform fee</p>
              </div>

              {/* Total Transactions */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Transactions</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stats?.total_transactions || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">This month</p>
              </div>

              {/* Platform Fees */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Platform Fees (5%)</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatCurrency(stats?.platform_fees || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">FlexCloud revenue share</p>
              </div>
            </div>

            {/* Revenue by Category */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
              {stats?.revenue_by_category && stats.revenue_by_category.length > 0 ? (
                <div className="space-y-3">
                  {stats.revenue_by_category.map((category: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50 hover:from-gray-100 hover:to-blue-100 transition">
                      <span className="font-medium text-gray-700">{category.name}</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(parseFloat(category.total))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No revenue data available for this month</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/businesses" className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 transition-all duration-200 text-left block">
                  <p className="text-sm font-semibold text-blue-900">Businesses</p>
                  <p className="text-xs text-blue-600 mt-1">Register & manage</p>
                </Link>
                <Link href="/invoices" className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 transition-all duration-200 text-left block">
                  <p className="text-sm font-semibold text-green-900">Invoices</p>
                  <p className="text-xs text-green-600 mt-1">Generate & track</p>
                </Link>
                <Link href="/revenue-items" className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 transition-all duration-200 text-left block">
                  <p className="text-sm font-semibold text-purple-900">Revenue Items</p>
                  <p className="text-xs text-purple-600 mt-1">Configure pricing</p>
                </Link>
                <Link href="/wards" className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 border border-orange-200 transition-all duration-200 text-left block">
                  <p className="text-sm font-semibold text-orange-900">Wards</p>
                  <p className="text-xs text-orange-600 mt-1">Manage locations</p>
                </Link>
              </div>
            </div>

            {/* Payment Testing */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 backdrop-blur-xl rounded-2xl shadow-lg border-2 border-yellow-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Test Payment Flow</h3>
                  <p className="text-sm text-gray-600">Simulate complete payment with revenue split</p>
                </div>
                <Link href="/payment-testing" className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-xl hover:from-yellow-600 hover:to-amber-700 transition shadow-lg font-semibold">
                  Try Now
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
