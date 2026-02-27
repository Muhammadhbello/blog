'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface WalletData {
  wallet: {
    id: number;
    balance: number;
    total_earned: number;
    total_withdrawn: number;
    pending_commission: number;
    status: string;
  };
  recent_transactions: Array<{
    id: number;
    type: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    reference: string;
    description: string;
    status: string;
    created_at: string;
  }>;
  pending_withdrawals: Array<{
    id: number;
    amount: number;
    bank_name: string;
    account_number: string;
    status: string;
    created_at: string;
  }>;
  stats: {
    total_earned: number;
    total_withdrawn: number;
    current_balance: number;
    pending_amount: number;
  };
}

export default function ConsultantWalletPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?type=consultant');
    } else if (user) {
      fetchWalletData();
    }
  }, [user, isLoading, router]);

  const fetchWalletData = async () => {
    try {
      const response = await apiClient.get('/wallet/my');
      setWalletData(response.data);
    } catch (error) {
      console.error('Failed to fetch wallet data', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiClient.post('/wallet/withdraw', {
        amount: parseFloat(withdrawForm.amount),
        bank_name: withdrawForm.bank_name,
        account_number: withdrawForm.account_number,
        account_name: withdrawForm.account_name,
      });
      
      toast.success('Withdrawal request submitted successfully');
      setShowWithdrawModal(false);
      setWithdrawForm({ amount: '', bank_name: '', account_number: '', account_name: '' });
      fetchWalletData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Wallet</h1>
            <p className="text-gray-500">Manage your commissions and withdrawals</p>
          </div>
          <button
            onClick={() => router.push('/consultant-portal')}
            className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {walletData && (
          <>
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Current Balance */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white col-span-1 md:col-span-2">
                <p className="text-indigo-200 text-sm mb-2">Available Balance</p>
                <p className="text-4xl font-bold mb-4">
                  {formatCurrency(walletData.stats.current_balance)}
                </p>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={walletData.stats.current_balance < 1000 || walletData.pending_withdrawals.length > 0}
                  className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {walletData.pending_withdrawals.length > 0
                    ? 'Withdrawal Pending'
                    : 'Request Withdrawal'}
                </button>
              </div>

              {/* Stats */}
              <div className="space-y-4">
                <div className="bg-white/80 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                  <p className="text-gray-500 text-xs mb-1">Total Earned</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(walletData.stats.total_earned)}
                  </p>
                </div>
                <div className="bg-white/80 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                  <p className="text-gray-500 text-xs mb-1">Total Withdrawn</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(walletData.stats.total_withdrawn)}
                  </p>
                </div>
              </div>
            </div>

            {/* Pending Withdrawals */}
            {walletData.pending_withdrawals.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-amber-800 mb-4">Pending Withdrawals</h3>
                <div className="space-y-3">
                  {walletData.pending_withdrawals.map((withdrawal) => (
                    <div
                      key={withdrawal.id}
                      className="flex items-center justify-between bg-white rounded-xl p-4"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{formatCurrency(withdrawal.amount)}</p>
                        <p className="text-sm text-gray-500">
                          {withdrawal.bank_name} - {withdrawal.account_number}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium capitalize">
                        {withdrawal.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {walletData.recent_transactions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No transactions yet
                  </div>
                ) : (
                  walletData.recent_transactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transaction.type === 'commission'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {transaction.type === 'commission' ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-8-6h16" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 capitalize">{transaction.type}</p>
                            <p className="text-sm text-gray-500">{transaction.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(transaction.created_at).toLocaleDateString('en-NG')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Request Withdrawal</h3>
            
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (NGN)
                </label>
                <input
                  type="number"
                  min="1000"
                  max={walletData?.stats.current_balance}
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter amount"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Min: ₦1,000 | Available: {formatCurrency(walletData?.stats.current_balance || 0)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <select
                  value={withdrawForm.bank_name}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Bank</option>
                  <option value="First Bank">First Bank</option>
                  <option value="GTBank">GTBank</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="UBA">UBA</option>
                  <option value="Zenith Bank">Zenith Bank</option>
                  <option value="Fidelity Bank">Fidelity Bank</option>
                  <option value="Sterling Bank">Sterling Bank</option>
                  <option value="Union Bank">Union Bank</option>
                  <option value="Polaris Bank">Polaris Bank</option>
                  <option value="Wema Bank">Wema Bank</option>
                  <option value="Keystone Bank">Keystone Bank</option>
                  <option value="Stanbic IBTC">Stanbic IBTC</option>
                  <option value="FCMB">FCMB</option>
                  <option value="Ecobank">Ecobank</option>
                  <option value="Heritage Bank">Heritage Bank</option>
                  <option value="Jaiz Bank">Jaiz Bank</option>
                  <option value="Kuda Bank">Kuda Bank</option>
                  <option value="Opay">Opay</option>
                  <option value="Palmpay">Palmpay</option>
                  <option value="Moniepoint">Moniepoint</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={withdrawForm.account_number}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, account_number: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter 10-digit account number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={withdrawForm.account_name}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, account_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter account holder name"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
