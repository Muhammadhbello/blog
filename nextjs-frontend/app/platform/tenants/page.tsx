'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PlatformLayout from '@/components/PlatformLayout';
import apiClient from '@/lib/api';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  subdomain: string;
  brand_color: string;
  revenue_share_model: string;
  share_value: number;
  status: string;
  state: string;
  users_count: number;
  businesses_count: number;
  total_revenue: number;
  platform_fees: number;
  created_at: string;
}

interface Stats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_users: number;
  total_platform_revenue: number;
  total_lga_revenue: number;
}

export default function PlatformTenantsPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [impersonating, setImpersonating] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subdomain: '',
    state: '',
    lga_code: '',
    brand_color: '#3B82F6',
    contact_email: '',
    contact_phone: '',
    address: '',
    revenue_share_model: 'percentage',
    share_value: '5.00',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    admin_phone: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'super_admin') {
      router.push('/dashboard');
    } else if (user && user.role === 'super_admin') {
      fetchData();
    }
  }, [user, isLoading, router]);

  const fetchData = async () => {
    try {
      const [tenantsRes, statsRes] = await Promise.all([
        apiClient.get('/platform/tenants'),
        apiClient.get('/platform/tenants-stats'),
      ]);
      setTenants(tenantsRes.data);
      setStats(statsRes.data);
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
      await apiClient.post('/platform/tenants', formData);
      setShowModal(false);
      setFormData({
        name: '', slug: '', subdomain: '', state: '', lga_code: '',
        brand_color: '#3B82F6', contact_email: '', contact_phone: '',
        address: '', revenue_share_model: 'percentage', share_value: '5.00',
        admin_name: '', admin_email: '', admin_password: '', admin_phone: '',
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const updateTenantStatus = async (tenantId: number, action: 'suspend' | 'activate') => {
    try {
      await apiClient.post(`/platform/tenants/${tenantId}/${action}`);
      fetchData();
    } catch (error) {
      alert('Failed to update tenant status');
    }
  };

  const enterTenantPortal = async (tenant: Tenant) => {
    if (tenant.status !== 'active') {
      alert('Cannot enter suspended tenant portal');
      return;
    }
    
    setImpersonating(tenant.id);
    try {
      const response = await apiClient.post(`/platform/tenants/${tenant.id}/impersonate`);
      const { token, user: impersonatedUser } = response.data;
      
      // Store the impersonation token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(impersonatedUser));
      localStorage.setItem('is_impersonation', 'true');
      localStorage.setItem('platform_return', 'true');
      
      // Redirect to tenant dashboard
      window.location.href = '/dashboard';
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to enter tenant portal');
    } finally {
      setImpersonating(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.subdomain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.state?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading || loading) {
    return (
      <PlatformLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Tenant Management</h2>
          <p className="text-purple-300 mt-1">Manage all LGA tenants and their revenue sharing</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg font-semibold flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add New Tenant</span>
        </button>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
          <p className="text-purple-300 text-xs font-medium">Total Tenants</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.total_tenants || 0}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
          <p className="text-green-300 text-xs font-medium">Active</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.active_tenants || 0}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
          <p className="text-yellow-300 text-xs font-medium">Suspended</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.suspended_tenants || 0}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
          <p className="text-blue-300 text-xs font-medium">Total Users</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.total_users || 0}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
          <p className="text-pink-300 text-xs font-medium">Platform Revenue</p>
          <p className="text-lg font-bold text-white mt-1">{formatCurrency(stats?.total_platform_revenue || 0)}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
          <p className="text-emerald-300 text-xs font-medium">LGA Revenue</p>
          <p className="text-lg font-bold text-white mt-1">{formatCurrency(stats?.total_lga_revenue || 0)}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search tenants by name, subdomain, or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant) => (
          <div
            key={tenant.id}
            className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: tenant.brand_color || '#3B82F6' }}
                >
                  {tenant.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{tenant.name}</h3>
                  <p className="text-xs text-purple-300">{tenant.subdomain}.flexcloud.ng</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                tenant.status === 'active' 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : tenant.status === 'suspended'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {tenant.status}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-xs text-purple-300">Users</p>
                <p className="text-lg font-bold text-white">{tenant.users_count || 0}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-xs text-purple-300">Businesses</p>
                <p className="text-lg font-bold text-white">{tenant.businesses_count || 0}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-xs text-purple-300">LGA Revenue</p>
                <p className="text-sm font-bold text-white">{formatCurrency(tenant.total_revenue)}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-xs text-purple-300">Platform Fee</p>
                <p className="text-sm font-bold text-white">{formatCurrency(tenant.platform_fees)}</p>
              </div>
            </div>

            {/* Revenue Share Info */}
            <div className="bg-purple-500/10 rounded-lg p-3 mb-4 border border-purple-500/20">
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-300">Revenue Share</span>
                <span className="text-sm font-bold text-white">
                  {tenant.revenue_share_model === 'percentage' 
                    ? `${tenant.share_value}% Platform / ${100 - tenant.share_value}% LGA`
                    : `₦${tenant.share_value} Fixed`
                  }
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => router.push(`/platform/tenants/${tenant.id}`)}
                className="flex-1 px-3 py-2 text-xs font-medium text-purple-300 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition"
              >
                View Details
              </button>
              {tenant.status === 'active' ? (
                <button
                  onClick={() => updateTenantStatus(tenant.id, 'suspend')}
                  className="px-3 py-2 text-xs font-medium text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/10 transition"
                >
                  Suspend
                </button>
              ) : (
                <button
                  onClick={() => updateTenantStatus(tenant.id, 'activate')}
                  className="px-3 py-2 text-xs font-medium text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/10 transition"
                >
                  Activate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <p className="text-purple-300">No tenants found. {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first tenant to get started.'}</p>
        </div>
      )}

      {/* Add Tenant Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-2xl w-full p-8 border border-purple-500/30 my-8">
            <h2 className="text-2xl font-bold text-white mb-6">Add New Tenant (LGA)</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-purple-300 mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">LGA Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
                      placeholder="Ikeja Local Government"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Subdomain *</label>
                    <div className="flex">
                      <input
                        type="text"
                        required
                        value={formData.subdomain}
                        onChange={(e) => {
                          const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                          setFormData({ ...formData, subdomain: value, slug: value });
                        }}
                        className="flex-1 px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
                        placeholder="ikeja-lga"
                      />
                      <span className="px-3 py-2.5 bg-purple-500/20 border border-l-0 border-purple-500/30 rounded-r-xl text-purple-300 text-sm">.flexcloud.ng</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
                      placeholder="Lagos State"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">LGA Code</label>
                    <input
                      type="text"
                      value={formData.lga_code}
                      onChange={(e) => setFormData({ ...formData, lga_code: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
                      placeholder="LG001"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold text-purple-300 mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
                      placeholder="contact@ikeja-lga.gov.ng"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
                      placeholder="+234 801 234 5678"
                    />
                  </div>
                </div>
              </div>

              {/* Revenue Share */}
              <div>
                <h3 className="text-sm font-semibold text-purple-300 mb-3">Revenue Sharing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Model</label>
                    <select
                      value={formData.revenue_share_model}
                      onChange={(e) => setFormData({ ...formData, revenue_share_model: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">
                      {formData.revenue_share_model === 'percentage' ? 'Platform Share (%)' : 'Fixed Monthly (₦)'}
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.share_value}
                      onChange={(e) => setFormData({ ...formData, share_value: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 bg-purple-500/10 p-3 rounded-xl border border-purple-500/30">
                  <p className="text-sm text-purple-200">
                    {formData.revenue_share_model === 'percentage' 
                      ? `FlexCloud: ${formData.share_value}% | LGA: ${100 - parseFloat(formData.share_value || '0')}%`
                      : `FlexCloud: ₦${formData.share_value} fixed monthly`
                    }
                  </p>
                </div>
              </div>

              {/* Admin Account */}
              <div>
                <h3 className="text-sm font-semibold text-purple-300 mb-3">Chairman Account (Admin)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.admin_name}
                      onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
                      placeholder="Hon. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.admin_email}
                      onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
                      placeholder="chairman@ikeja-lga.gov.ng"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={formData.admin_password}
                      onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.admin_phone}
                      onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
                      placeholder="+234 801 234 5678"
                    />
                  </div>
                </div>
              </div>

              {/* Branding */}
              <div>
                <h3 className="text-sm font-semibold text-purple-300 mb-3">Branding</h3>
                <div>
                  <label className="block text-xs font-medium text-purple-300 mb-1">Brand Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.brand_color}
                      onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                      className="w-12 h-12 rounded-xl border border-purple-500/30 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.brand_color}
                      onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                      className="flex-1 px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-purple-500/30 rounded-xl hover:bg-white/5 transition text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 font-semibold"
                >
                  {submitting ? 'Creating...' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}
