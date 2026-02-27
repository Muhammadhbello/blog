'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

interface ConsultantDashboard {
  consultant: {
    id: number;
    name: string;
    email: string;
    phone: string;
    company_name: string;
    commission_rate: number;
    total_collected: number;
    total_commission: number;
  };
  stats: {
    today_collections: number;
    today_tickets: number;
    week_collections: number;
    pending_closings: number;
    assigned_points: number;
  };
  assignments: any[];
  recent_tickets: any[];
  recent_closings: any[];
}

export default function ConsultantPortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<ConsultantDashboard | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'tickets' | 'closings'>('overview');
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [availableTickets, setAvailableTickets] = useState<any[]>([]);
  const [selling, setSelling] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const loginType = localStorage.getItem('login_type');
    
    if (!token || loginType !== 'consultant') {
      router.push('/login?type=consultant');
      return;
    }
    
    fetchDashboard();
  }, [router]);

  const fetchDashboard = async () => {
    try {
      const response = await apiClient.get('/consultant/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard', error);
      router.push('/login?type=consultant');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('login_type');
    router.push('/login?type=consultant');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount || 0);
  };

  const openSellModal = async (assignment: any) => {
    setSelectedBatch(assignment);
    try {
      const response = await apiClient.get(`/consultant/my-tickets?batch_id=${assignment.batch_id}`);
      setAvailableTickets(response.data.filter((t: any) => t.status === 'available'));
      setShowSellModal(true);
    } catch (error) {
      alert('Failed to load tickets');
    }
  };

  const sellTicket = async (ticketId: number) => {
    setSelling(true);
    try {
      await apiClient.post('/tickets/sell', {
        ticket_id: ticketId,
        payment_method: 'cash',
      });
      // Remove sold ticket from list
      setAvailableTickets(prev => prev.filter(t => t.id !== ticketId));
      fetchDashboard(); // Refresh stats
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to sell ticket');
    } finally {
      setSelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'variance_flagged': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <p className="text-gray-500">Failed to load dashboard</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              {dashboard.consultant.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{dashboard.consultant.name}</h1>
              <p className="text-sm text-gray-500">{dashboard.consultant.company_name || 'Consultant'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden md:block">
              <p className="text-sm text-gray-600">{dashboard.consultant.email}</p>
              <p className="text-xs text-indigo-600">{dashboard.consultant.commission_rate}% Commission</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
              data-testid="consultant-logout-btn"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl p-5 text-white shadow-lg">
            <p className="text-indigo-100 text-sm">Today's Collections</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(dashboard.stats.today_collections)}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Tickets Sold Today</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{dashboard.stats.today_tickets}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">This Week</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(dashboard.stats.week_collections)}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Pending Closings</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{dashboard.stats.pending_closings}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Assigned Points</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{dashboard.stats.assigned_points}</p>
          </div>
        </div>

        {/* Commission Summary */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 mb-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-amber-100 text-sm font-medium mb-1">Your Earnings</p>
              <p className="text-3xl font-bold">{formatCurrency(dashboard.consultant.total_commission)}</p>
              <p className="text-amber-200 text-sm mt-1">
                Total Collections: {formatCurrency(dashboard.consultant.total_collected)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-xl p-4 text-center">
                <p className="text-amber-100 text-xs">Commission Rate</p>
                <p className="text-2xl font-bold">{dashboard.consultant.commission_rate}%</p>
              </div>
              <button
                onClick={() => router.push('/consultant-portal/wallet')}
                className="px-6 py-3 bg-white text-amber-600 rounded-xl font-semibold hover:bg-amber-50 transition flex items-center gap-2"
                data-testid="view-wallet-btn"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                My Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {(['overview', 'assignments', 'tickets', 'closings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('tickets')}
                  className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition text-center"
                >
                  <svg className="w-8 h-8 mx-auto text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">Sell Ticket</span>
                </button>
                <button
                  onClick={() => setActiveTab('closings')}
                  className="p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition text-center"
                >
                  <svg className="w-8 h-8 mx-auto text-amber-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">Submit Closing</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tickets</h3>
              <div className="space-y-3">
                {dashboard.recent_tickets.slice(0, 5).map((ticket: any) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{ticket.ticket_number}</p>
                      <p className="text-xs text-gray-500">{new Date(ticket.sold_at).toLocaleString()}</p>
                    </div>
                    <span className="font-bold text-green-600">{formatCurrency(ticket.amount)}</span>
                  </div>
                ))}
                {dashboard.recent_tickets.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No recent tickets</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">My Assignments</h3>
              <p className="text-sm text-gray-500">Revenue points and batches assigned to you</p>
            </div>
            <div className="divide-y divide-gray-100">
              {dashboard.assignments.map((assignment: any) => (
                <div key={assignment.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{assignment.revenue_point_name}</h4>
                      <p className="text-sm text-gray-500">{assignment.revenue_point_code}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm">
                        <span className="text-gray-600">
                          <strong>Batch:</strong> {assignment.batch_number}
                        </span>
                        <span className="text-gray-600">
                          <strong>Price:</strong> {formatCurrency(assignment.unit_price)}
                        </span>
                        <span className="text-gray-600">
                          <strong>Available:</strong> {assignment.available_tickets}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => openSellModal(assignment)}
                      disabled={assignment.available_tickets === 0}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Sell Ticket
                    </button>
                  </div>
                </div>
              ))}
              {dashboard.assignments.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No assignments found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="consultant-tickets-table">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Ticket #</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Revenue Point</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Sold At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboard.recent_tickets.map((ticket: any) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-mono text-sm text-gray-900">{ticket.ticket_number}</td>
                      <td className="px-6 py-4 text-gray-600">{ticket.revenue_point_name}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(ticket.amount)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          ticket.status === 'sold' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {ticket.sold_at ? new Date(ticket.sold_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dashboard.recent_tickets.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No tickets found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'closings' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="consultant-closings-table">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Revenue Point</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Period</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Expected</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Remitted</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Variance</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboard.recent_closings.map((closing: any) => (
                    <tr key={closing.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{closing.revenue_point_name}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {new Date(closing.period_start).toLocaleDateString()} - {new Date(closing.period_end).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(closing.expected_amount)}</td>
                      <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(closing.remitted_amount)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={closing.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {closing.variance >= 0 ? '+' : ''}{formatCurrency(closing.variance)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(closing.status)}`}>
                          {closing.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dashboard.recent_closings.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No closings found</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sell Ticket Modal */}
      {showSellModal && selectedBatch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Sell Ticket</h2>
                <p className="text-sm text-gray-500">{selectedBatch.revenue_point_name}</p>
              </div>
              <button onClick={() => setShowSellModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-4 bg-indigo-50 rounded-xl">
              <p className="text-sm text-indigo-600">Price per ticket</p>
              <p className="text-2xl font-bold text-indigo-900">{formatCurrency(selectedBatch.unit_price)}</p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-mono text-sm text-gray-900">{ticket.ticket_number}</span>
                  <button
                    onClick={() => sellTicket(ticket.id)}
                    disabled={selling}
                    className="px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium"
                  >
                    {selling ? 'Selling...' : 'Sell'}
                  </button>
                </div>
              ))}
              {availableTickets.length === 0 && (
                <p className="text-center text-gray-500 py-4">No available tickets</p>
              )}
            </div>

            <button
              onClick={() => setShowSellModal(false)}
              className="w-full mt-4 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
