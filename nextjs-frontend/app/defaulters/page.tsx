'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';

interface Defaulter {
  id: number;
  business: {
    id: number;
    owner_name: string;
    phone: string;
  };
  amount_due: number;
  days_overdue: number;
  last_reminder_sent: string | null;
  reminder_count: number;
}

export default function DefaultersPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [minDays, setMinDays] = useState('7');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchDefaulters();
    }
  }, [user, isLoading, router]);

  const fetchDefaulters = async () => {
    try {
      const response = await apiClient.get('/defaulters');
      setDefaulters(response.data);
    } catch (error) {
      console.error('Failed to fetch defaulters', error);
    } finally {
      setLoading(false);
    }
  };

  const detectDefaulters = async () => {
    setDetecting(true);
    try {
      const response = await apiClient.post('/defaulters/detect');
      toast.success('Defaulter Detection Complete', {
        description: response.data.message,
      });
      fetchDefaulters();
    } catch (error: any) {
      toast.error('Detection failed', {
        description: error.response?.data?.message || 'An error occurred',
      });
    } finally {
      setDetecting(false);
    }
  };

  const sendReminder = async (defaulterId: number) => {
    try {
      const response = await apiClient.post(`/defaulters/${defaulterId}/remind`);
      toast.success('SMS Sent!', {
        description: 'Payment reminder sent successfully',
      });
      fetchDefaulters();
    } catch (error: any) {
      toast.error('Failed to send SMS', {
        description: error.response?.data?.message || 'An error occurred',
      });
    }
  };

  const sendBulkReminders = async () => {
    setSendingBulk(true);
    try {
      const response = await apiClient.post('/defaulters/bulk-remind', {
        min_days_overdue: parseInt(minDays),
      });
      toast.success('Bulk SMS Sent!', {
        description: response.data.message,
      });
      fetchDefaulters();
    } catch (error: any) {
      toast.error('Bulk send failed', {
        description: error.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSendingBulk(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const totalAmountDue = defaulters.reduce((sum, d) => sum + parseFloat(d.amount_due.toString()), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FlexCloud
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-700 font-medium">Defaulters Management</span>
            </div>
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">← Back to Dashboard</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Defaulters Management</h1>
            <p className="text-gray-600 mt-1">Track overdue payments and send SMS reminders</p>
          </div>
          <button
            onClick={detectDefaulters}
            disabled={detecting}
            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition shadow-lg disabled:opacity-50"
          >
            {detecting ? 'Detecting...' : '🔍 Detect Defaulters'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
            <p className="text-sm text-gray-600 mb-1">Total Defaulters</p>
            <p className="text-3xl font-bold text-red-600">{defaulters.length}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
            <p className="text-sm text-gray-600 mb-1">Total Amount Due</p>
            <p className="text-3xl font-bold text-orange-600">{formatCurrency(totalAmountDue)}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
            <p className="text-sm text-gray-600 mb-1">Reminders Sent</p>
            <p className="text-3xl font-bold text-blue-600">
              {defaulters.reduce((sum, d) => sum + d.reminder_count, 0)}
            </p>
          </div>
        </div>

        {/* Bulk Actions */}
        {defaulters.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl shadow-lg border-2 border-yellow-300 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Send Bulk SMS Reminders</h3>
                <p className="text-sm text-gray-600 mb-3">Send payment reminders to all defaulters with minimum overdue days</p>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="1"
                    value={minDays}
                    onChange={(e) => setMinDays(e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="7"
                  />
                  <span className="text-sm text-gray-600">days overdue or more</span>
                </div>
              </div>
              <button
                onClick={sendBulkReminders}
                disabled={sendingBulk}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:from-orange-600 hover:to-red-700 transition shadow-lg disabled:opacity-50 font-semibold"
              >
                {sendingBulk ? 'Sending...' : '📱 Send Bulk SMS'}
              </button>
            </div>
          </div>
        )}

        {/* Defaulters List */}
        <div className="space-y-4">
          {defaulters.map((defaulter) => (
            <div
              key={defaulter.id}
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{defaulter.business.owner_name}</h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      defaulter.days_overdue >= 30 ? 'bg-red-100 text-red-800' :
                      defaulter.days_overdue >= 14 ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {defaulter.days_overdue} days overdue
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{defaulter.business.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Amount Due</p>
                      <p className="text-sm font-bold text-red-600">{formatCurrency(defaulter.amount_due)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Reminder</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(defaulter.last_reminder_sent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reminders Sent</p>
                      <p className="text-sm font-medium text-gray-900">{defaulter.reminder_count}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => sendReminder(defaulter.id)}
                  className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition text-sm font-medium shadow-md"
                >
                  📱 Send SMS
                </button>
              </div>
            </div>
          ))}
        </div>

        {defaulters.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg font-medium">No defaulters found!</p>
            <p className="text-gray-400 text-sm mt-1">All payments are up to date. Click "Detect Defaulters" to scan for overdue invoices.</p>
          </div>
        )}
      </main>
    </div>
  );
}
