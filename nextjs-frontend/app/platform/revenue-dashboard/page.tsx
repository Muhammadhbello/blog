'use client';

import React, { useState, useEffect } from 'react';
import { PlatformLayout } from '@/components/PlatformLayout';
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  CreditCard, 
  DollarSign,
  Activity,
  Calendar,
  ArrowUpRight,
  ChevronDown,
  RefreshCw,
  Download,
  Filter,
  Loader2,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon,
  Wallet,
  Scale,
  Users,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  RadialBarChart,
  RadialBar
} from 'recharts';
import apiClient from '@/lib/api';

// Color palette
const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  chart: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']
};

interface RevenueData {
  date: string;
  gross: number;
  platform_fee: number;
  net: number;
  transactions: number;
}

interface TenantRevenue {
  name: string;
  gross: number;
  platform_fee: number;
  transactions: number;
  growth: number;
}

interface CategoryData {
  name: string;
  value: number;
  count: number;
}

interface PayoutData {
  month: string;
  pending: number;
  completed: number;
  amount: number;
}

interface ReconciliationData {
  period: string;
  matched: number;
  unmatched: number;
  disputed: number;
  rate: number;
}

export default function RevenueDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('month');
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [tenantRevenue, setTenantRevenue] = useState<TenantRevenue[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [payoutData, setPayoutData] = useState<PayoutData[]>([]);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData[]>([]);
  const [stats, setStats] = useState({
    totalGross: 0,
    totalPlatformFee: 0,
    totalTransactions: 0,
    avgTransactionValue: 0,
    monthlyGrowth: 0,
    matchRate: 0,
  });

  useEffect(() => {
    fetchData();
  }, [range]);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      // Mock data for demonstration
      const mockRevenueData: RevenueData[] = [
        { date: '2025-01-01', gross: 4500000, platform_fee: 225000, net: 4275000, transactions: 312 },
        { date: '2025-01-02', gross: 3800000, platform_fee: 190000, net: 3610000, transactions: 267 },
        { date: '2025-01-03', gross: 5200000, platform_fee: 260000, net: 4940000, transactions: 398 },
        { date: '2025-01-04', gross: 4100000, platform_fee: 205000, net: 3895000, transactions: 289 },
        { date: '2025-01-05', gross: 6100000, platform_fee: 305000, net: 5795000, transactions: 456 },
        { date: '2025-01-06', gross: 5500000, platform_fee: 275000, net: 5225000, transactions: 412 },
        { date: '2025-01-07', gross: 4900000, platform_fee: 245000, net: 4655000, transactions: 367 },
        { date: '2025-01-08', gross: 5800000, platform_fee: 290000, net: 5510000, transactions: 423 },
        { date: '2025-01-09', gross: 6300000, platform_fee: 315000, net: 5985000, transactions: 478 },
        { date: '2025-01-10', gross: 5100000, platform_fee: 255000, net: 4845000, transactions: 389 },
        { date: '2025-01-11', gross: 4700000, platform_fee: 235000, net: 4465000, transactions: 345 },
        { date: '2025-01-12', gross: 5900000, platform_fee: 295000, net: 5605000, transactions: 434 },
        { date: '2025-01-13', gross: 6500000, platform_fee: 325000, net: 6175000, transactions: 498 },
        { date: '2025-01-14', gross: 5400000, platform_fee: 270000, net: 5130000, transactions: 401 },
      ];

      const mockTenantRevenue: TenantRevenue[] = [
        { name: 'Potiskum LGA', gross: 25750000, platform_fee: 1287500, transactions: 1856, growth: 12.5 },
        { name: 'Damaturu LGA', gross: 18920000, platform_fee: 946000, transactions: 1432, growth: 8.3 },
        { name: 'Nguru LGA', gross: 12450000, platform_fee: 622500, transactions: 987, growth: -2.1 },
        { name: 'Gashua LGA', gross: 9800000, platform_fee: 490000, transactions: 756, growth: 15.7 },
        { name: 'Geidam LGA', gross: 7650000, platform_fee: 382500, transactions: 612, growth: 5.2 },
      ];

      const mockCategoryData: CategoryData[] = [
        { name: 'Business License', value: 35000000, count: 2456 },
        { name: 'Property Tax', value: 28000000, count: 1823 },
        { name: 'Market Fees', value: 15000000, count: 4521 },
        { name: 'Vehicle Registration', value: 12000000, count: 987 },
        { name: 'Trade Permits', value: 8500000, count: 654 },
        { name: 'Others', value: 6500000, count: 1234 },
      ];

      const mockPayoutData: PayoutData[] = [
        { month: 'Sep', pending: 3, completed: 12, amount: 42500000 },
        { month: 'Oct', pending: 2, completed: 14, amount: 48200000 },
        { month: 'Nov', pending: 4, completed: 13, amount: 45800000 },
        { month: 'Dec', pending: 2, completed: 15, amount: 52300000 },
        { month: 'Jan', pending: 5, completed: 10, amount: 38500000 },
      ];

      const mockReconciliationData: ReconciliationData[] = [
        { period: 'Week 1', matched: 312, unmatched: 8, disputed: 2, rate: 96.9 },
        { period: 'Week 2', matched: 345, unmatched: 5, disputed: 1, rate: 98.3 },
        { period: 'Week 3', matched: 289, unmatched: 12, disputed: 3, rate: 95.1 },
        { period: 'Week 4', matched: 378, unmatched: 7, disputed: 2, rate: 97.7 },
      ];

      setRevenueData(mockRevenueData);
      setTenantRevenue(mockTenantRevenue);
      setCategoryData(mockCategoryData);
      setPayoutData(mockPayoutData);
      setReconciliationData(mockReconciliationData);

      const totalGross = mockRevenueData.reduce((sum, d) => sum + d.gross, 0);
      const totalPlatformFee = mockRevenueData.reduce((sum, d) => sum + d.platform_fee, 0);
      const totalTransactions = mockRevenueData.reduce((sum, d) => sum + d.transactions, 0);

      setStats({
        totalGross,
        totalPlatformFee,
        totalTransactions,
        avgTransactionValue: Math.round(totalGross / totalTransactions),
        monthlyGrowth: 12.5,
        matchRate: 97.2,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return '₦' + (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return '₦' + (value / 1000).toFixed(0) + 'K';
    }
    return '₦' + value.toFixed(0);
  };

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-gray-100">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900">
                {typeof entry.value === 'number' && entry.value > 1000 
                  ? formatFullCurrency(entry.value)
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <PlatformLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
            <h1 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h1>
            <p className="text-gray-500">Comprehensive platform revenue analytics</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            
            <button
              onClick={fetchData}
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-blue-100">
                <TrendingUp className="h-4 w-4" />
                {stats.monthlyGrowth}%
              </span>
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(stats.totalGross)}</div>
            <div className="text-blue-100 text-sm">Total Gross Revenue</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-emerald-100 text-sm font-medium">5% Share</span>
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(stats.totalPlatformFee)}</div>
            <div className="text-emerald-100 text-sm">Platform Earnings</div>
          </div>

          <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-violet-100 text-sm font-medium">{formatCurrency(stats.avgTransactionValue)} avg</span>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.totalTransactions.toLocaleString()}</div>
            <div className="text-violet-100 text-sm">Total Transactions</div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Scale className="h-5 w-5" />
              </div>
              <span className="text-amber-100 text-sm font-medium">Reconciliation</span>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.matchRate}%</div>
            <div className="text-amber-100 text-sm">Match Rate</div>
          </div>
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend Area Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
                <p className="text-sm text-gray-500">Daily gross revenue and platform fees</p>
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
            
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFee" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).getDate().toString()}
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="gross"
                  name="Gross Revenue"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGross)"
                />
                <Area
                  type="monotone"
                  dataKey="platform_fee"
                  name="Platform Fee"
                  stroke={COLORS.success}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFee)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Category Pie Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">By Category</h3>
                <p className="text-sm text-gray-500">Revenue distribution</p>
              </div>
              <PieChartIcon className="h-5 w-5 text-gray-400" />
            </div>
            
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="space-y-2 mt-4">
              {categoryData.slice(0, 4).map((cat, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.chart[i] }}></div>
                    <span className="text-gray-600 truncate">{cat.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tenant Performance Bar Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tenant Performance</h3>
                <p className="text-sm text-gray-500">Revenue by LGA</p>
              </div>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={tenantRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={formatCurrency} stroke="#9ca3af" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100} 
                  stroke="#9ca3af" 
                  fontSize={12}
                  tickFormatter={(value) => value.replace(' LGA', '')}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="gross" name="Gross Revenue" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                <Bar dataKey="platform_fee" name="Platform Fee" fill={COLORS.success} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Reconciliation Status Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Reconciliation Status</h3>
                <p className="text-sm text-gray-500">Weekly match rate</p>
              </div>
              <Scale className="h-5 w-5 text-gray-400" />
            </div>
            
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={reconciliationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" stroke="#9ca3af" fontSize={12} />
                <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} domain={[90, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="matched" name="Matched" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="unmatched" name="Unmatched" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="disputed" name="Disputed" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="rate" name="Match Rate %" stroke={COLORS.secondary} strokeWidth={3} dot={{ fill: COLORS.secondary, strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payouts and Transactions Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payout History */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Payout History</h3>
                <p className="text-sm text-gray-500">Monthly payout trends</p>
              </div>
              <Wallet className="h-5 w-5 text-gray-400" />
            </div>
            
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={payoutData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrency} stroke="#9ca3af" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="completed" name="Completed" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="pending" name="Pending" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="amount" name="Amount" stroke={COLORS.primary} strokeWidth={3} dot={{ fill: COLORS.primary, strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Transaction Volume */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Transaction Volume</h3>
                <p className="text-sm text-gray-500">Daily transaction count</p>
              </div>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).getDate().toString()}
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="transactions" 
                  name="Transactions"
                  stroke={COLORS.secondary} 
                  strokeWidth={3}
                  dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: COLORS.secondary }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tenant Growth Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tenant Growth Analysis</h3>
                <p className="text-sm text-gray-500">Month-over-month performance comparison</p>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Platform Fee</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Transactions</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Growth</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenantRevenue.map((tenant, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                          {tenant.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{tenant.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-gray-900">{formatFullCurrency(tenant.gross)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-emerald-600 font-medium">{formatFullCurrency(tenant.platform_fee)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {tenant.transactions.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        tenant.growth >= 0 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {tenant.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(tenant.growth)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-8 mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[
                            { v: Math.random() * 100 },
                            { v: Math.random() * 100 },
                            { v: Math.random() * 100 },
                            { v: Math.random() * 100 },
                            { v: tenant.growth >= 0 ? 80 + Math.random() * 20 : 20 + Math.random() * 30 },
                          ]}>
                            <Line 
                              type="monotone" 
                              dataKey="v" 
                              stroke={tenant.growth >= 0 ? COLORS.success : COLORS.danger}
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
}
