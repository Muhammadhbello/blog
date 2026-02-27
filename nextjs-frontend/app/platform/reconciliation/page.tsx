'use client';

import React, { useState, useEffect } from 'react';
import { PlatformLayout } from '@/components/PlatformLayout';
import { 
  Scale, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock,
  Search,
  Filter,
  Download,
  ChevronDown,
  Eye,
  RefreshCw,
  Loader2,
  Building2,
  CreditCard,
  ArrowLeftRight,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Check,
  X,
  MoreVertical
} from 'lucide-react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'fee' | 'adjustment';
  tenant_id: number;
  tenant_name: string;
  amount: number;
  reference: string;
  invoice_number?: string;
  business_name?: string;
  status: 'matched' | 'unmatched' | 'disputed' | 'resolved';
  gateway: string;
  gateway_reference?: string;
  reconciled_at?: string;
  notes?: string;
  created_at: string;
}

interface ReconciliationStats {
  total_transactions: number;
  matched_count: number;
  matched_amount: number;
  unmatched_count: number;
  unmatched_amount: number;
  disputed_count: number;
  match_rate: number;
}

interface ReconciliationPeriod {
  id: string;
  period: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'in_progress' | 'completed';
  total_transactions: number;
  matched: number;
  unmatched: number;
  total_amount: number;
}

export default function PlatformReconciliationPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [periods, setPeriods] = useState<ReconciliationPeriod[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'periods'>('transactions');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      // Mock transactions data
      const mockTransactions: Transaction[] = [
        {
          id: 'TXN-001',
          type: 'payment',
          tenant_id: 1,
          tenant_name: 'Potiskum LGA',
          amount: 125000,
          reference: 'PAY-2025-00123',
          invoice_number: 'INV-2025-00456',
          business_name: 'ABC Ventures Ltd',
          status: 'matched',
          gateway: 'PaymentPoint',
          gateway_reference: 'PP-TXN-789012',
          reconciled_at: '2025-01-15T14:30:00Z',
          created_at: '2025-01-15T10:00:00Z',
        },
        {
          id: 'TXN-002',
          type: 'payment',
          tenant_id: 1,
          tenant_name: 'Potiskum LGA',
          amount: 75000,
          reference: 'PAY-2025-00124',
          invoice_number: 'INV-2025-00457',
          business_name: 'XYZ Stores',
          status: 'unmatched',
          gateway: 'PaymentPoint',
          gateway_reference: 'PP-TXN-789013',
          notes: 'Amount mismatch - expected 80,000',
          created_at: '2025-01-15T11:30:00Z',
        },
        {
          id: 'TXN-003',
          type: 'payment',
          tenant_id: 2,
          tenant_name: 'Damaturu LGA',
          amount: 250000,
          reference: 'PAY-2025-00125',
          invoice_number: 'INV-2025-00458',
          business_name: 'Global Services Co',
          status: 'disputed',
          gateway: 'PalmPay',
          gateway_reference: 'PM-TXN-456789',
          notes: 'Customer claims payment was made twice',
          created_at: '2025-01-14T09:00:00Z',
        },
        {
          id: 'TXN-004',
          type: 'refund',
          tenant_id: 2,
          tenant_name: 'Damaturu LGA',
          amount: -50000,
          reference: 'REF-2025-00012',
          invoice_number: 'INV-2025-00445',
          business_name: 'Quick Mart',
          status: 'matched',
          gateway: 'PalmPay',
          gateway_reference: 'PM-REF-123456',
          reconciled_at: '2025-01-14T16:00:00Z',
          created_at: '2025-01-14T15:30:00Z',
        },
        {
          id: 'TXN-005',
          type: 'payment',
          tenant_id: 3,
          tenant_name: 'Nguru LGA',
          amount: 180000,
          reference: 'PAY-2025-00126',
          invoice_number: 'INV-2025-00459',
          business_name: 'Modern Enterprises',
          status: 'matched',
          gateway: 'PaymentPoint',
          gateway_reference: 'PP-TXN-789014',
          reconciled_at: '2025-01-13T10:00:00Z',
          created_at: '2025-01-13T08:45:00Z',
        },
      ];

      // Mock periods data
      const mockPeriods: ReconciliationPeriod[] = [
        {
          id: 'RP-001',
          period: 'January 2025 - Week 3',
          start_date: '2025-01-15',
          end_date: '2025-01-21',
          status: 'in_progress',
          total_transactions: 245,
          matched: 238,
          unmatched: 7,
          total_amount: 12500000,
        },
        {
          id: 'RP-002',
          period: 'January 2025 - Week 2',
          start_date: '2025-01-08',
          end_date: '2025-01-14',
          status: 'completed',
          total_transactions: 312,
          matched: 312,
          unmatched: 0,
          total_amount: 15750000,
        },
        {
          id: 'RP-003',
          period: 'January 2025 - Week 1',
          start_date: '2025-01-01',
          end_date: '2025-01-07',
          status: 'completed',
          total_transactions: 287,
          matched: 285,
          unmatched: 2,
          total_amount: 14200000,
        },
      ];

      let filtered = mockTransactions;
      if (filter !== 'all') {
        filtered = mockTransactions.filter(t => t.status === filter);
      }
      if (search) {
        filtered = filtered.filter(t => 
          t.reference.toLowerCase().includes(search.toLowerCase()) ||
          t.business_name?.toLowerCase().includes(search.toLowerCase()) ||
          t.invoice_number?.toLowerCase().includes(search.toLowerCase())
        );
      }

      setTransactions(filtered);
      setPeriods(mockPeriods);

      // Mock stats
      setStats({
        total_transactions: 844,
        matched_count: 835,
        matched_amount: 42450000,
        unmatched_count: 9,
        unmatched_amount: 725000,
        disputed_count: 3,
        match_rate: 98.9,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async () => {
    setReconciling(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success('Reconciliation completed successfully');
      fetchData();
    } catch (error) {
      toast.error('Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  const resolveTransaction = async (id: string, action: 'match' | 'reject') => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(action === 'match' ? 'Transaction matched' : 'Transaction rejected');
      fetchData();
      setSelectedTransaction(null);
    } catch (error) {
      toast.error('Failed to resolve transaction');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      matched: 'bg-green-50 text-green-700 border-green-200',
      unmatched: 'bg-amber-50 text-amber-700 border-amber-200',
      disputed: 'bg-red-50 text-red-700 border-red-200',
      resolved: 'bg-blue-50 text-blue-700 border-blue-200',
      pending: 'bg-gray-50 text-gray-700 border-gray-200',
      in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
      completed: 'bg-green-50 text-green-700 border-green-200',
    };
    const icons = {
      matched: <CheckCircle2 className="h-3 w-3" />,
      unmatched: <AlertCircle className="h-3 w-3" />,
      disputed: <AlertTriangle className="h-3 w-3" />,
      resolved: <Check className="h-3 w-3" />,
      pending: <Clock className="h-3 w-3" />,
      in_progress: <RefreshCw className="h-3 w-3 animate-spin" />,
      completed: <CheckCircle2 className="h-3 w-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      payment: 'bg-green-50 text-green-700',
      refund: 'bg-red-50 text-red-700',
      fee: 'bg-blue-50 text-blue-700',
      adjustment: 'bg-purple-50 text-purple-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[type as keyof typeof styles]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
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
            <h1 className="text-2xl font-bold text-gray-900">Payment Reconciliation</h1>
            <p className="text-gray-500">Match and verify payment transactions</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={runReconciliation}
              disabled={reconciling}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {reconciling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reconciling...
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4" />
                  Run Reconciliation
                </>
              )}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700">
              <Download className="h-4 w-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-blue-600">{stats?.match_rate}%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.total_transactions}</div>
            <div className="text-sm text-gray-500">Total Transactions</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs text-green-600 font-medium">{formatCurrency(stats?.matched_amount || 0)}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.matched_count}</div>
            <div className="text-sm text-gray-500">Matched</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-xs text-amber-600 font-medium">{formatCurrency(stats?.unmatched_amount || 0)}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.unmatched_count}</div>
            <div className="text-sm text-gray-500">Unmatched</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-xs text-red-600 font-medium">Needs Review</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.disputed_count}</div>
            <div className="text-sm text-gray-500">Disputed</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'transactions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('periods')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'periods'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Reconciliation Periods
          </button>
        </div>

        {activeTab === 'transactions' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by reference, business, or invoice..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex gap-2">
                  {['all', 'matched', 'unmatched', 'disputed'].map((status) => (
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

            {/* Transactions Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gateway</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-mono text-sm text-gray-900">{txn.reference}</div>
                            <div className="text-xs text-gray-500">{txn.invoice_number}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {getTypeBadge(txn.type)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-700">{txn.tenant_name}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-700">{txn.business_name || '-'}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={`font-medium ${txn.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {txn.amount < 0 ? '-' : ''}{formatCurrency(txn.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="text-sm text-gray-700">{txn.gateway}</div>
                            <div className="text-xs text-gray-400 font-mono">{txn.gateway_reference}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {getStatusBadge(txn.status)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedTransaction(txn)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4 text-gray-500" />
                            </button>
                            {txn.status === 'unmatched' && (
                              <>
                                <button
                                  onClick={() => resolveTransaction(txn.id, 'match')}
                                  className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Match"
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </button>
                                <button
                                  onClick={() => resolveTransaction(txn.id, 'reject')}
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Reject"
                                >
                                  <X className="h-4 w-4 text-red-600" />
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
              
              {transactions.length === 0 && (
                <div className="p-12 text-center text-gray-400">
                  <Scale className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No transactions found</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'periods' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Range</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Transactions</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Matched</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unmatched</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {periods.map((period) => (
                    <tr key={period.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <span className="font-medium text-gray-900">{period.period}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">
                          {formatDate(period.start_date).split(',')[0]} - {formatDate(period.end_date).split(',')[0]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-medium text-gray-900">{period.total_transactions}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          {period.matched}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          period.unmatched > 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'
                        }`}>
                          {period.unmatched}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-medium text-gray-900">{formatCurrency(period.total_amount)}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getStatusBadge(period.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transaction Details Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Reference</span>
                  <span className="font-mono font-medium">{selectedTransaction.reference}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Type</span>
                  {getTypeBadge(selectedTransaction.type)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className={`font-bold ${selectedTransaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(selectedTransaction.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
                
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Tenant</span>
                    <span>{selectedTransaction.tenant_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Business</span>
                    <span>{selectedTransaction.business_name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Invoice</span>
                    <span className="font-mono">{selectedTransaction.invoice_number || '-'}</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Gateway</span>
                    <span>{selectedTransaction.gateway}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Gateway Ref</span>
                    <span className="font-mono text-sm">{selectedTransaction.gateway_reference}</span>
                  </div>
                </div>

                {selectedTransaction.notes && (
                  <div className="border-t border-gray-100 pt-4">
                    <span className="text-gray-500 text-sm">Notes</span>
                    <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedTransaction.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                >
                  Close
                </button>
                {selectedTransaction.status === 'unmatched' && (
                  <button
                    onClick={() => resolveTransaction(selectedTransaction.id, 'match')}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Mark as Matched
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
