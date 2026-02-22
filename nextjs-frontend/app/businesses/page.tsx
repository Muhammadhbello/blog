'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import Link from 'next/link';

interface Business {
  id: number;
  owner_name: string;
  phone: string;
  address: string | null;
  rc_number: string | null;
  virtual_account_number: string | null;
  virtual_account_bank: string | null;
  is_account_active: boolean;
}

export default function BusinessesPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    owner_name: '',
    phone: '',
    address: '',
    rc_number: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchBusinesses();
    }
  }, [user, isLoading, router]);

  const fetchBusinesses = async () => {
    try {
      const response = await apiClient.get('/businesses');
      setBusinesses(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to fetch businesses', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiClient.post('/businesses', {
        ...formData,
        tenant_id: user?.tenant_id,
      });
      setShowModal(false);
      setFormData({
        owner_name: '',
        phone: '',
        address: '',
        rc_number: '',
      });
      fetchBusinesses();
      alert('Business registered successfully! Virtual account will be generated.');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to register business');
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
              <span className="text-gray-700 font-medium">Businesses</span>
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
            <h1 className="text-3xl font-bold text-gray-900">Business Registry</h1>
            <p className="text-gray-600 mt-1">Manage registered businesses with virtual accounts</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
          >
            + Register Business
          </button>
        </div>

        {/* Businesses Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {businesses.map((business) => (
            <div
              key={business.id}
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{business.owner_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{business.phone}</p>
                  {business.address && (
                    <p className="text-sm text-gray-600 mt-1">{business.address}</p>
                  )}
                </div>
                {business.is_account_active ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
                    Pending
                  </span>
                )}
              </div>

              {business.virtual_account_number ? (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Virtual Account</p>
                  <p className="text-lg font-bold text-gray-900">{business.virtual_account_number}</p>
                  <p className="text-sm text-gray-600 mt-1">{business.virtual_account_bank}</p>
                  <button className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    Copy Account Number
                  </button>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <p className="text-sm text-yellow-800">Virtual account generation in progress...</p>
                </div>
              )}

              {business.rc_number && (
                <div className="mt-3 flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  RC: {business.rc_number}
                </div>
              )}
            </div>
          ))}
        </div>

        {businesses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No businesses registered yet. Register your first business to get started.</p>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Register New Business</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Owner Name</label>
                <input
                  type="text"
                  required
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+234 801 234 5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Market Street, Lagos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RC Number (Optional)</label>
                <input
                  type="text"
                  value={formData.rc_number}
                  onChange={(e) => setFormData({ ...formData, rc_number: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="RC123456"
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> A unique virtual account will be automatically generated for payment collection.
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
                  {submitting ? 'Registering...' : 'Register Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
