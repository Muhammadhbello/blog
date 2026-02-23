'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

interface BusinessDashboard {
  business: {
    id: number;
    name: string;
    registration_number: string;
    owner_name: string;
    owner_email: string;
    owner_phone: string;
    address: string;
    business_type: string;
    size: string;
    virtual_account_number: string;
    virtual_account_bank: string;
  };
  stats: {
    total_invoiced: number;
    total_paid: number;
    total_balance: number;
    pending_invoices: number;
    overdue_invoices: number;
  };
  recent_invoices: any[];
  recent_payments: any[];
}

export default function BusinessPortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments'>('overview');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const loginType = localStorage.getItem('login_type');
    
    if (!token || loginType !== 'business') {
      router.push('/login?type=business');
      return;
    }
    
    fetchDashboard();
  }, [router]);

  const fetchDashboard = async () => {
    try {
      const response = await apiClient.get('/business/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard', error);
      router.push('/login?type=business');
    } finally {
      setLoading(false);
    }
  };

  const copyAccountNumber = () => {
    if (dashboard?.business.virtual_account_number) {
      navigator.clipboard.writeText(dashboard.business.virtual_account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('login_type');
    router.push('/login?type=business');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount || 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'partially_paid': return 'bg-blue-100 text-blue-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <p className="text-gray-500">Failed to load dashboard</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              {dashboard.business.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{dashboard.business.name}</h1>
              <p className="text-sm text-gray-500">{dashboard.business.registration_number}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{dashboard.business.owner_name}</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
              data-testid="business-logout-btn"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Virtual Account Card */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 mb-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Your Payment Account</p>
              <p className="text-3xl font-bold tracking-wider mb-2">
                {dashboard.business.virtual_account_number || 'Not assigned'}
              </p>
              <p className="text-emerald-200">{dashboard.business.virtual_account_bank || 'Pending'}</p>
            </div>
            <div className="flex flex-col items-start md:items-end space-y-2">
              <button
                onClick={copyAccountNumber}
                disabled={!dashboard.business.virtual_account_number}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition flex items-center space-x-2 disabled:opacity-50"
                data-testid="copy-account-btn"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{copied ? 'Copied!' : 'Copy Account'}</span>
              </button>
              <p className="text-xs text-emerald-200">Transfer to this account to pay invoices</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Total Invoiced</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(dashboard.stats.total_invoiced)}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Total Paid</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(dashboard.stats.total_paid)}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Outstanding</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(dashboard.stats.total_balance)}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Pending Invoices</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{dashboard.stats.pending_invoices}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Overdue</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{dashboard.stats.overdue_invoices}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          {(['overview', 'invoices', 'payments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                activeTab === tab
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Business Info */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Business Name</span>
                  <span className="font-medium text-gray-900">{dashboard.business.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Registration No.</span>
                  <span className="font-medium text-gray-900">{dashboard.business.registration_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Business Type</span>
                  <span className="font-medium text-gray-900 capitalize">{dashboard.business.business_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Size</span>
                  <span className="font-medium text-gray-900 capitalize">{dashboard.business.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Address</span>
                  <span className="font-medium text-gray-900 text-right max-w-[200px]">{dashboard.business.address}</span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Owner Name</span>
                  <span className="font-medium text-gray-900">{dashboard.business.owner_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-900">{dashboard.business.owner_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-medium text-gray-900">{dashboard.business.owner_phone}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="business-invoices-table">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Invoice #</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Paid</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Balance</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboard.recent_invoices.map((invoice: any) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">{invoice.invoice_number}</td>
                      <td className="px-6 py-4 text-gray-600">{new Date(invoice.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</td>
                      <td className="px-6 py-4 text-right text-green-600">{formatCurrency(invoice.amount_paid)}</td>
                      <td className="px-6 py-4 text-right text-amber-600">{formatCurrency(invoice.balance)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">{new Date(invoice.due_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dashboard.recent_invoices.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No invoices found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="business-payments-table">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Reference</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Method</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboard.recent_payments.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-mono text-sm text-gray-900">{payment.reference}</td>
                      <td className="px-6 py-4 text-gray-600">{new Date(payment.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                      <td className="px-6 py-4 text-gray-600 capitalize">{payment.payment_method}</td>
                      <td className="px-6 py-4 text-gray-600">{payment.invoice_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dashboard.recent_payments.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No payments found</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
