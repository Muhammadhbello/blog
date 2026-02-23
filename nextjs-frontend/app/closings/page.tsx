'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TenantLayout from '@/components/TenantLayout';
import apiClient from '@/lib/api';

interface RevenuePoint {
  id: number;
  name: string;
  code: string;
  closing_frequency: string;
}

interface Closing {
  id: number;
  revenue_point_id: number;
  revenue_point_name: string;
  revenue_point_code: string;
  period_type: 'daily' | 'weekly';
  period_start: string;
  period_end: string;
  expected_amount: number;
  remitted_amount: number;
  variance: number;
  variance_percentage: number;
  status: 'submitted' | 'approved' | 'rejected' | 'variance_flagged';
  submitted_by: number;
  submitted_by_name: string;
  approved_by?: number;
  approved_by_name?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
}

interface ClosingStats {
  total_closings: number;
  total_expected: number;
  total_remitted: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  flagged_count: number;
  recent: Closing[];
}

export default function ClosingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [closings, setClosings] = useState<Closing[]>([]);
  const [stats, setStats] = useState<ClosingStats | null>(null);
  const [revenuePoints, setRevenuePoints] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClosing, setSelectedClosing] = useState<Closing | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [calculating, setCalculating] = useState(false);
  const [expectedAmount, setExpectedAmount] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    revenue_point_id: '',
    period_type: 'daily',
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    remitted_amount: '',
    cash_collected: '',
    transfer_collected: '',
    pos_collected: '',
    remittance_method: 'cash',
    remittance_reference: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchData();
    }
  }, [user, isLoading, router]);

  const fetchData = async () => {
    try {
      const [closingsRes, statsRes, pointsRes] = await Promise.all([
        apiClient.get('/closings'),
        apiClient.get('/closings/stats'),
        apiClient.get('/revenue-points'),
      ]);
      setClosings(closingsRes.data);
      setStats(statsRes.data);
      setRevenuePoints(pointsRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateExpected = async () => {
    if (!formData.revenue_point_id || !formData.period_start || !formData.period_end) return;
    setCalculating(true);
    try {
      const res = await apiClient.get('/closings/calculate-expected', {
        params: {
          revenue_point_id: formData.revenue_point_id,
          period_start: formData.period_start,
          period_end: formData.period_end,
        },
      });
      setExpectedAmount(res.data.expected_amount);
    } catch (error) {
      console.error('Failed to calculate expected amount', error);
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (showModal && formData.revenue_point_id && formData.period_start && formData.period_end) {
      calculateExpected();
    }
  }, [formData.revenue_point_id, formData.period_start, formData.period_end, showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        revenue_point_id: parseInt(formData.revenue_point_id),
        remitted_amount: parseFloat(formData.remitted_amount),
        cash_collected: formData.cash_collected ? parseFloat(formData.cash_collected) : 0,
        transfer_collected: formData.transfer_collected ? parseFloat(formData.transfer_collected) : 0,
        pos_collected: formData.pos_collected ? parseFloat(formData.pos_collected) : 0,
      };

      await apiClient.post('/closings', payload);
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to submit closing');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      revenue_point_id: '',
      period_type: 'daily',
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date().toISOString().split('T')[0],
      remitted_amount: '',
      cash_collected: '',
      transfer_collected: '',
      pos_collected: '',
      remittance_method: 'cash',
      remittance_reference: '',
      notes: '',
    });
    setExpectedAmount(null);
  };

  const handleApprove = async (closingId: number) => {
    if (!confirm('Approve this closing?')) return;
    try {
      await apiClient.post(`/closings/${closingId}/approve`);
      fetchData();
      setShowDetailModal(false);
    } catch (error) {
      alert('Failed to approve closing');
    }
  };

  const handleReject = async (closingId: number) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await apiClient.post(`/closings/${closingId}/reject`, { reason });
      fetchData();
      setShowDetailModal(false);
    } catch (error) {
      alert('Failed to reject closing');
    }
  };

  const viewClosing = (closing: Closing) => {
    setSelectedClosing(closing);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'variance_flagged': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) <= 1) return 'text-green-600';
    if (Math.abs(variance) <= 5) return 'text-amber-600';
    return 'text-red-600';
  };

  const filteredClosings = closings.filter(c => 
    statusFilter === 'all' || c.status === statusFilter
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
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
          <h2 className="text-3xl font-bold text-gray-900">Closings</h2>
          <p className="text-gray-600 mt-1">Daily & weekly revenue reconciliation</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-lg font-semibold flex items-center space-x-2"
          data-testid="submit-closing-btn"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>Submit Closing</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Total Closings</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_closings}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Expected</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(stats.total_expected)}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Remitted</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(stats.total_remitted)}</p>
          </div>
          <div className="bg-blue-50 backdrop-blur-xl rounded-xl border border-blue-200/50 p-5 shadow-sm">
            <p className="text-blue-600 text-sm">Pending</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{stats.pending_count}</p>
          </div>
          <div className="bg-green-50 backdrop-blur-xl rounded-xl border border-green-200/50 p-5 shadow-sm">
            <p className="text-green-600 text-sm">Approved</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{stats.approved_count}</p>
          </div>
          <div className="bg-amber-50 backdrop-blur-xl rounded-xl border border-amber-200/50 p-5 shadow-sm">
            <p className="text-amber-600 text-sm">Flagged</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{stats.flagged_count}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {['all', 'submitted', 'approved', 'rejected', 'variance_flagged'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
          </button>
        ))}
      </div>

      {/* Closings Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="closings-table">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Revenue Point</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Period</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Expected</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Remitted</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Variance</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Submitted By</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClosings.map((closing) => (
                <tr key={closing.id} className="hover:bg-gray-50 transition" data-testid={`closing-row-${closing.id}`}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{closing.revenue_point_name}</p>
                      <p className="text-xs text-gray-500">{closing.revenue_point_code}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        closing.period_type === 'daily' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {closing.period_type}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(closing.period_start).toLocaleDateString()} - {new Date(closing.period_end).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(closing.expected_amount)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(closing.remitted_amount)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className={`font-medium ${getVarianceColor(closing.variance_percentage)}`}>
                      {closing.variance >= 0 ? '+' : ''}{formatCurrency(closing.variance)}
                    </p>
                    <p className={`text-xs ${getVarianceColor(closing.variance_percentage)}`}>
                      ({closing.variance_percentage >= 0 ? '+' : ''}{closing.variance_percentage.toFixed(1)}%)
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{closing.submitted_by_name}</p>
                    <p className="text-xs text-gray-500">{new Date(closing.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(closing.status)}`}>
                      {closing.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => viewClosing(closing)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        View
                      </button>
                      {closing.status === 'submitted' && (
                        <>
                          <button
                            onClick={() => handleApprove(closing.id)}
                            className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(closing.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClosings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No closings found.</p>
          </div>
        )}
      </div>

      {/* Submit Closing Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 my-8" data-testid="closing-modal">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Submit Closing</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Revenue Point</label>
                  <select
                    required
                    value={formData.revenue_point_id}
                    onChange={(e) => setFormData({ ...formData, revenue_point_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="closing-point-select"
                  >
                    <option value="">Select Revenue Point</option>
                    {revenuePoints.map(point => (
                      <option key={point.id} value={point.id}>
                        {point.name} ({point.code}) - {point.closing_frequency}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Type</label>
                  <select
                    value={formData.period_type}
                    onChange={(e) => setFormData({ ...formData, period_type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remittance Method</label>
                  <select
                    value={formData.remittance_method}
                    onChange={(e) => setFormData({ ...formData, remittance_method: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="pos">POS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                  <input
                    type="date"
                    required
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                  <input
                    type="date"
                    required
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {expectedAmount !== null && (
                  <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">Expected Amount (System Calculated)</span>
                      <span className="text-xl font-bold text-blue-800">
                        {calculating ? 'Calculating...' : formatCurrency(expectedAmount)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remitted Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.remitted_amount}
                    onChange={(e) => setFormData({ ...formData, remitted_amount: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    data-testid="closing-remitted-input"
                  />
                </div>

                <div className="col-span-2 grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cash</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cash_collected}
                      onChange={(e) => setFormData({ ...formData, cash_collected: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Transfer</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.transfer_collected}
                      onChange={(e) => setFormData({ ...formData, transfer_collected: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">POS</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.pos_collected}
                      onChange={(e) => setFormData({ ...formData, pos_collected: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference (Optional)</label>
                  <input
                    type="text"
                    value={formData.remittance_reference}
                    onChange={(e) => setFormData({ ...formData, remittance_reference: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bank transfer reference, receipt number, etc."
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 font-semibold"
                  data-testid="closing-submit-btn"
                >
                  {submitting ? 'Submitting...' : 'Submit Closing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedClosing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Closing Details</h2>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedClosing.status)}`}>
                {selectedClosing.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Revenue Point</p>
                <p className="font-semibold text-gray-900">{selectedClosing.revenue_point_name}</p>
                <p className="text-xs text-gray-500">{selectedClosing.revenue_point_code}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Period</p>
                  <p className="font-semibold text-gray-900 capitalize">{selectedClosing.period_type}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedClosing.period_start).toLocaleDateString()} - {new Date(selectedClosing.period_end).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Submitted By</p>
                  <p className="font-semibold text-gray-900">{selectedClosing.submitted_by_name}</p>
                  <p className="text-xs text-gray-500">{new Date(selectedClosing.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-blue-600">Expected</p>
                  <p className="font-bold text-blue-800">{formatCurrency(selectedClosing.expected_amount)}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-green-600">Remitted</p>
                  <p className="font-bold text-green-800">{formatCurrency(selectedClosing.remitted_amount)}</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${selectedClosing.variance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-sm ${selectedClosing.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>Variance</p>
                  <p className={`font-bold ${selectedClosing.variance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    {selectedClosing.variance >= 0 ? '+' : ''}{formatCurrency(selectedClosing.variance)}
                  </p>
                  <p className={`text-xs ${selectedClosing.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({selectedClosing.variance_percentage >= 0 ? '+' : ''}{selectedClosing.variance_percentage.toFixed(1)}%)
                  </p>
                </div>
              </div>

              {selectedClosing.notes && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700">{selectedClosing.notes}</p>
                </div>
              )}

              {selectedClosing.rejection_reason && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm text-red-600">Rejection Reason</p>
                  <p className="text-red-700">{selectedClosing.rejection_reason}</p>
                </div>
              )}

              {selectedClosing.approved_by_name && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm text-green-600">Approved By</p>
                  <p className="text-green-700">{selectedClosing.approved_by_name}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-gray-700"
              >
                Close
              </button>
              {selectedClosing.status === 'submitted' && (
                <>
                  <button
                    onClick={() => handleApprove(selectedClosing.id)}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedClosing.id)}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
