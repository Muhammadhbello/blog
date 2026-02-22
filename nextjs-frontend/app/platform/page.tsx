'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string;
  revenue_share_model: string;
  share_value: number;
  status: string;
  created_at: string;
}

export default function PlatformDashboard() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    brand_color: '#3B82F6',
    revenue_share_model: 'percentage',
    share_value: '5.00',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'super_admin') {
      router.push('/dashboard');
    } else if (user && user.role === 'super_admin') {
      fetchTenants();
    }
  }, [user, isLoading, router]);

  const fetchTenants = async () => {
    try {
      const response = await apiClient.get('/tenants');
      setTenants(response.data);
    } catch (error) {
      console.error('Failed to fetch tenants', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiClient.post('/tenants', formData);
      setShowModal(false);
      setFormData({
        name: '',
        slug: '',
        brand_color: '#3B82F6',
        revenue_share_model: 'percentage',
        share_value: '5.00',
      });
      fetchTenants();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const updateTenantStatus = async (tenantId: number, status: string) => {
    try {
      await apiClient.put(`/tenants/${tenantId}`, { status });
      fetchTenants();
    } catch (error) {
      alert('Failed to update tenant status');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <nav className="bg-black/40 backdrop-blur-xl border-b border-purple-500/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                FlexCloud Platform
              </h1>
              <span className="ml-4 px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Super Admin
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-purple-300">Platform Administrator</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition border border-red-500/30"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Tenant Management</h2>
            <p className="text-purple-300 mt-1">Manage all LGA tenants and revenue sharing</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
          >
            + Add New Tenant
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <p className="text-purple-300 text-sm">Total Tenants</p>
            <p className="text-3xl font-bold text-white mt-2">{tenants.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <p className="text-green-300 text-sm">Active Tenants</p>
            <p className="text-3xl font-bold text-white mt-2">
              {tenants.filter(t => t.status === 'active').length}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <p className="text-yellow-300 text-sm">Suspended</p>
            <p className="text-3xl font-bold text-white mt-2">
              {tenants.filter(t => t.status === 'suspended').length}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <p className="text-purple-300 text-sm">Avg Revenue Share</p>
            <p className="text-3xl font-bold text-white mt-2">
              {(tenants.reduce((sum, t) => sum + parseFloat(t.share_value.toString()), 0) / tenants.length || 0).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Tenants List */}
        <div className="space-y-4">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{tenant.name}</h3>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full capitalize"
                      style={{
                        backgroundColor: tenant.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 
                                       tenant.status === 'suspended' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                        color: tenant.status === 'active' ? '#86efac' : 
                              tenant.status === 'suspended' ? '#fde047' : '#d1d5db',
                        border: `1px solid ${tenant.status === 'active' ? 'rgba(34, 197, 94, 0.3)' : 
                                            tenant.status === 'suspended' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(156, 163, 175, 0.3)'}`
                      }}>
                      {tenant.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-purple-300">Slug</p>
                      <p className="text-sm text-white font-medium">{tenant.slug}</p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-300">Revenue Model</p>
                      <p className="text-sm text-white font-medium capitalize">{tenant.revenue_share_model}</p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-300">Platform Share</p>
                      <p className="text-sm text-white font-medium">
                        {tenant.revenue_share_model === 'percentage' ? `${tenant.share_value}%` : `₦${tenant.share_value}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-300">LGA Share</p>
                      <p className="text-sm text-white font-medium">
                        {tenant.revenue_share_model === 'percentage' ? `${100 - parseFloat(tenant.share_value.toString())}%` : 'Variable'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {tenant.status === 'active' && (
                    <button
                      onClick={() => updateTenantStatus(tenant.id, 'suspended')}
                      className="px-3 py-1 text-xs font-medium text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/10 transition"
                    >
                      Suspend
                    </button>
                  )}
                  {tenant.status === 'suspended' && (
                    <button
                      onClick={() => updateTenantStatus(tenant.id, 'active')}
                      className="px-3 py-1 text-xs font-medium text-green-400 hover:text-green-300 border border-green-500/30 rounded-lg hover:bg-green-500/10 transition"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {tenants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-purple-300">No tenants yet. Create your first tenant to get started.</p>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-purple-500/30">
            <h2 className="text-2xl font-bold text-white mb-6">Add New Tenant</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-1">LGA Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                  placeholder="Lagos State LGA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-1">Slug (unique identifier)</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                  placeholder="lagos-lga"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-1">Brand Color</label>
                <input
                  type="color"
                  value={formData.brand_color}
                  onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                  className="w-full h-12 rounded-xl border border-purple-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-1">Revenue Share Model</label>
                <select
                  value={formData.revenue_share_model}
                  onChange={(e) => setFormData({ ...formData, revenue_share_model: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-1">
                  {formData.revenue_share_model === 'percentage' ? 'Platform Share (%)' : 'Fixed Monthly Amount (₦)'}
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.share_value}
                  onChange={(e) => setFormData({ ...formData, share_value: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                  placeholder="5.00"
                />
              </div>
              <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/30">
                <p className="text-sm text-purple-200">
                  {formData.revenue_share_model === 'percentage' 
                    ? `FlexCloud: ${formData.share_value}% | LGA: ${100 - parseFloat(formData.share_value || '0')}%`
                    : `FlexCloud: ₦${formData.share_value} fixed monthly`
                  }
                </p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-purple-500/30 rounded-xl hover:bg-white/5 transition text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
