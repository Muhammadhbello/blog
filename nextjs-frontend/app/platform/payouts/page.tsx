'use client';

import React, { useState, useEffect } from 'react';
import { PlatformLayout } from '@/components/PlatformLayout';
import { 
  DollarSign, 
  ArrowUpRight, 
  Building2, 
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  ChevronDown,
  Eye,
  Send,
  RefreshCw,
  Loader2,
  Banknote,
  TrendingUp,
  Wallet,
  CreditCard
} from 'lucide-react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface Payout {
  id: string;
  tenant_id: number;
  tenant_name: string;
  tenant_slug: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  period_start: string;
  period_end: string;
  transaction_count: number;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  processed_at?: string;
  reference?: string;
  created_at: string;
}

interface PayoutStats {
  total_pending: number;
  total_pending_amount: number;
  total_completed_this_month: number;
  total_paid_this_month: number;
  average_payout_time: string;
}

export default function PlatformPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState<Payout | null>(null);

  useEffect(() => {
    fetchPayouts();
    fetchStats();
  }, [filter]);

  const fetchPayouts = async () => {
    try {
      // Mock data for demonstration
      const mockPayouts: Payout[] = [
        {
          id: 'PO-001',
          tenant_id: 1,
          tenant_name: 'Potiskum LGA',
          tenant_slug: 'potiskum',
          amount: 15750000,
          platform_fee: 787500,
          net_amount: 14962500,
          status: 'pending',
          period_start: '2025-01-01',
          period_end: '2025-01-15',
          transaction_count: 1245,
          bank_name: 'First Bank',
          account_number: '3021234567',
          account_name: 'Potiskum LGA Revenue Account',
          created_at: '2025-01-16T10:00:00Z',
        },
        {
          id: 'PO-002',
          tenant_id: 2,
          tenant_name: 'Damaturu LGA',
          tenant_slug: 'damaturu',
          amount: 8920000,
          platform_fee: 446000,
          net_amount: 8474000,
          status: 'processing',
          period_start: '2025-01-01',
          period_end: '2025-01-15',
          transaction_count: 876,
          bank_name: 'Zenith Bank',
          account_number: '1021234567',
          account_name: 'Damaturu LGA Revenue Account',
          created_at: '2025-01-16T10:00:00Z',
        },
        {
          id: 'PO-003',
          tenant_id: 3,
          tenant_name: 'Nguru LGA',
          tenant_slug: 'nguru',
          amount: 6450000,
          platform_fee: 322500,
          net_amount: 6127500,
          status: 'completed',
          period_start: '2024-12-16',
          period_end: '2024-12-31',
          transaction_count: 654,
          bank_name: 'GTBank',
          account_number: '0123456789',
          account_name: 'Nguru LGA Revenue Account',
          processed_at: '2025-01-05T14:30:00Z',
          reference: 'TRF-2025010500123',
          created_at: '2025-01-02T10:00:00Z',
        },
        {
          id: 'PO-004',
          tenant_id: 1,
          tenant_name: 'Potiskum LGA',
          tenant_slug: 'potiskum',
          amount: 12300000,
          platform_fee: 615000,
          net_amount: 11685000,
          status: 'completed',
          period_start: '2024-12-16',
          period_end: '2024-12-31',
          transaction_count: 1102,
          bank_name: 'First Bank',
          account_number: '3021234567',
          account_name: 'Potiskum LGA Revenue Account',
          processed_at: '2025-01-03T11:20:00Z',
          reference: 'TRF-2025010300089',
          created_at: '2025-01-01T10:00:00Z',
        },
      ];
      
      let filtered = mockPayouts;
      if (filter !== 'all') {
        filtered = mockPayouts.filter(p => p.status === filter);
      }
      if (search) {
        filtered = filtered.filter(p => 
          p.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
          p.id.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      setPayouts(filtered);
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    // Mock stats
    setStats({
      total_pending: 2,
      total_pending_amount: 23436500,
      total_completed_this_month: 5,
      total_paid_this_month: 42750000,
      average_payout_time: '2.3 days',
    });
  };

  const processPayout = async (payoutId: string) => {
    setProcessing(payoutId);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Payout processed successfully');
      fetchPayouts();
    } catch (error) {
      toast.error('Failed to process payout');
    } finally {
      setProcessing(null);
    }
  };

  const processBulkPayouts = async () => {
    if (selectedPayouts.length === 0) {
      toast.error('Please select payouts to process');
      return;
    }
    
    setProcessing('bulk');
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success(`${selectedPayouts.length} payouts processed successfully`);
      setSelectedPayouts([]);
      fetchPayouts();
    } catch (error) {
      toast.error('Failed to process payouts');
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      processing: 'bg-blue-50 text-blue-700 border-blue-200',
      completed: 'bg-green-50 text-green-700 border-green-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
    };
    const icons = {
      pending: <Clock className="h-3 w-3" />,
      processing: <RefreshCw className="h-3 w-3 animate-spin" />,
      completed: <CheckCircle2 className="h-3 w-3" />,
      failed: <XCircle className="h-3 w-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedPayouts(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAllPending = () => {
    const pendingIds = payouts.filter(p => p.status === 'pending').map(p => p.id);
    setSelectedPayouts(pendingIds);
  };

  if (loading) {
    return (
      <PlatformLayout>
        <div className="flex items-center justify-center min-h-[400px]">
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
            <h1 className="text-2xl font-bold text-gray-900">Platform Payouts</h1>
            <p className="text-gray-500">Manage tenant revenue payouts</p>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedPayouts.length > 0 && (
              <button
                onClick={processBulkPayouts}
                disabled={processing === 'bulk'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {processing === 'bulk' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Process Selected ({selectedPayouts.length})
              </button>
            )}
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-amber-100 text-sm font-medium">Pending</span>
            </div>
            <div className="text-2xl font-bold mb-1">{stats?.total_pending || 0}</div>
            <div className="text-amber-100 text-sm">{formatCurrency(stats?.total_pending_amount || 0)}</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-green-100 text-sm font-medium">Completed This Month</span>
            </div>
            <div className="text-2xl font-bold mb-1">{stats?.total_completed_this_month || 0}</div>
            <div className="text-green-100 text-sm">{formatCurrency(stats?.total_paid_this_month || 0)}</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-blue-100 text-sm font-medium">Avg Processing Time</span>
            </div>
            <div className="text-2xl font-bold mb-1">{stats?.average_payout_time || 'N/A'}</div>
            <div className="text-blue-100 text-sm">From request to completion</div>
          </div>

          <div className="bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-violet-100 text-sm font-medium">Platform Earnings</span>
            </div>
            <div className="text-2xl font-bold mb-1">{formatCurrency(2170500)}</div>
            <div className="text-violet-100 text-sm">This month's fees</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by tenant or payout ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              {['all', 'pending', 'processing', 'completed', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Payout Requests</h3>
            <button
              onClick={selectAllPending}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Select All Pending
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPayouts.length === payouts.filter(p => p.status === 'pending').length && selectedPayouts.length > 0}
                      onChange={selectAllPending}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payout ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Platform Fee</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Payout</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      {payout.status === 'pending' && (
                        <input
                          type="checkbox"
                          checked={selectedPayouts.includes(payout.id)}
                          onChange={() => toggleSelect(payout.id)}
                          className="rounded border-gray-300"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm text-gray-900">{payout.id}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                          {payout.tenant_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{payout.tenant_name}</div>
                          <div className="text-xs text-gray-500">{payout.transaction_count} transactions</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {formatDate(payout.period_start)} - {formatDate(payout.period_end)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-medium text-gray-900">{formatCurrency(payout.amount)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-amber-600">{formatCurrency(payout.platform_fee)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-semibold text-green-600">{formatCurrency(payout.net_amount)}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getStatusBadge(payout.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setShowDetails(payout)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 text-gray-500" />
                        </button>
                        {payout.status === 'pending' && (
                          <button
                            onClick={() => processPayout(payout.id)}
                            disabled={processing === payout.id}
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Process Payout"
                          >
                            {processing === payout.id ? (
                              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 text-blue-600" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {payouts.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              <Banknote className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No payouts found</p>
            </div>
          )}
        </div>

        {/* Payout Details Modal */}
        {showDetails && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Payout Details</h3>
                  <button
                    onClick={() => setShowDetails(null)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Payout ID</span>
                  <span className="font-mono font-medium">{showDetails.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Tenant</span>
                  <span className="font-medium">{showDetails.tenant_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Period</span>
                  <span>{formatDate(showDetails.period_start)} - {formatDate(showDetails.period_end)}</span>
                </div>
                
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Gross Amount</span>
                    <span className="font-medium">{formatCurrency(showDetails.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Platform Fee (5%)</span>
                    <span className="text-amber-600">-{formatCurrency(showDetails.platform_fee)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="font-medium text-gray-900">Net Payout</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(showDetails.net_amount)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h4 className="font-medium text-gray-900">Bank Details</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Bank</span>
                    <span>{showDetails.bank_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Account Number</span>
                    <span className="font-mono">{showDetails.account_number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Account Name</span>
                    <span>{showDetails.account_name}</span>
                  </div>
                </div>

                {showDetails.reference && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Transfer Reference</span>
                      <span className="font-mono text-sm">{showDetails.reference}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setShowDetails(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                >
                  Close
                </button>
                {showDetails.status === 'pending' && (
                  <button
                    onClick={() => {
                      processPayout(showDetails.id);
                      setShowDetails(null);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Process Payout
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}
