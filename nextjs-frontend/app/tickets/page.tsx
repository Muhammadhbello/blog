'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';

interface TicketBatch {
  id: number;
  batch_number: string;
  start_serial: number;
  end_serial: number;
  total_tickets: number;
  status: string;
  revenue_item: {
    name: string;
  };
  created_at: string;
}

interface RevenueItem {
  id: number;
  name: string;
  type: string;
}

export default function TicketsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [batches, setBatches] = useState<TicketBatch[]>([]);
  const [revenueItems, setRevenueItems] = useState<RevenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    revenue_item_id: '',
    quantity: '100',
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
      const [batchesRes, itemsRes] = await Promise.all([
        apiClient.get('/tickets/batches'),
        apiClient.get('/revenue-items?type=ticket'),
      ]);
      setBatches(batchesRes.data.data || batchesRes.data);
      setRevenueItems(itemsRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await apiClient.post('/tickets/batch', {
        ...formData,
        tenant_id: user?.tenant_id,
      });
      
      toast.success('Ticket Batch Created!', {
        description: response.data.message,
      });
      
      setShowModal(false);
      setFormData({ revenue_item_id: '', quantity: '100' });
      fetchData();
    } catch (error: any) {
      toast.error('Failed to create batch', {
        description: error.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loading) {
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
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FlexCloud
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-700 font-medium">Ticketing System</span>
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
            <h1 className="text-3xl font-bold text-gray-900">Ticketing System</h1>
            <p className="text-gray-600 mt-1">Manage ticket batches with QR codes</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
          >
            + Create Batch
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-4">
            <p className="text-sm text-gray-600">Total Batches</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{batches.length}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-4">
            <p className="text-sm text-gray-600">Active Batches</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {batches.filter(b => b.status === 'active').length}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-4">
            <p className="text-sm text-gray-600">Total Tickets</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {batches.reduce((sum, b) => sum + b.total_tickets, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-4">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {batches.filter(b => b.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Batches List */}
        <div className="space-y-4">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{batch.batch_number}</h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${
                      batch.status === 'active' ? 'bg-green-100 text-green-800' :
                      batch.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {batch.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Revenue Item</p>
                      <p className="text-sm font-medium text-gray-900">{batch.revenue_item.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Serial Range</p>
                      <p className="text-sm font-medium text-gray-900">
                        {String(batch.start_serial).padStart(8, '0')} - {String(batch.end_serial).padStart(8, '0')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Tickets</p>
                      <p className="text-sm font-medium text-gray-900">{batch.total_tickets.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {batches.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <p className="text-gray-500">No ticket batches yet. Create your first batch to get started.</p>
          </div>
        )}
      </main>

      {/* Create Batch Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Ticket Batch</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Revenue Item (Ticket Type)</label>
                <select
                  required
                  value={formData.revenue_item_id}
                  onChange={(e) => setFormData({ ...formData, revenue_item_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Ticket Type</option>
                  {revenueItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (1-10,000)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10000"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Each ticket will be generated with a unique serial number and QR code.
                  Tickets will be automatically numbered starting from the last batch.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
