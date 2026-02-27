'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import EnhancedTenantLayout from '@/components/layout/EnhancedTenantLayout';
import apiClient from '@/lib/api';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Send,
  MessageSquare,
  Filter,
  Search,
  CheckSquare,
  Square,
  Phone,
  Building,
  Calendar,
  DollarSign,
  ChevronDown,
  X,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface Defaulter {
  id: number;
  business_id: number;
  business: {
    id: number;
    name: string;
    owner_name: string;
    phone: string;
    owner_phone: string;
    address: string;
    size: string;
    ward?: { name: string };
  };
  amount_due: number;
  days_overdue: number;
  reminder_count: number;
  last_reminder_sent: string | null;
  status: string;
}

interface Stats {
  total_defaulters: number;
  total_outstanding: number;
  by_days_overdue: { [key: string]: number };
  by_size: Array<{ size: string; count: number; total: number }>;
  by_ward: Array<{ id: number; name: string; count: number; total: number }>;
  never_reminded: number;
  sms_balance?: { success: boolean; balance?: number };
}

interface Template {
  id: number;
  name: string;
  slug: string;
  content: string;
  type: string;
}

export default function DefaultersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    min_days: '',
    max_reminder_count: '',
    min_amount: '',
    ward_id: '',
    business_size: '',
    status: '',
  });
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0 });

  useEffect(() => {
    if (!authLoading && user) {
      fetchDefaulters();
      fetchStats();
      fetchTemplates();
    }
  }, [user, authLoading, pagination.page, filters]);

  const fetchDefaulters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('per_page', pagination.per_page.toString());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const res = await apiClient.get(`/defaulters?${params.toString()}`);
      setDefaulters(res.data.data || res.data);
      if (res.data.total) {
        setPagination(prev => ({ ...prev, total: res.data.total }));
      }
    } catch (error) {
      console.error('Failed to fetch defaulters', error);
      toast.error('Failed to load defaulters');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/defaulters/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await apiClient.get('/defaulters/templates');
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates', error);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === defaulters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(defaulters.map(d => d.id)));
    }
  };

  const previewMessage = async () => {
    if (!customMessage || selectedIds.size === 0) return;
    
    const firstId = Array.from(selectedIds)[0];
    try {
      const res = await apiClient.post('/defaulters/preview-message', {
        message: customMessage,
        defaulter_id: firstId,
      });
      setPreviewResult(res.data);
      setShowPreviewModal(true);
    } catch (error) {
      toast.error('Failed to preview message');
    }
  };

  const sendBulkSMS = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one defaulter');
      return;
    }

    setSendingBulk(true);
    try {
      const res = await apiClient.post('/defaulters/bulk-remind', {
        defaulter_ids: Array.from(selectedIds),
        message: customMessage || undefined,
      });

      toast.success(`Sent ${res.data.sent} reminders, ${res.data.failed} failed`);
      setShowBulkModal(false);
      setSelectedIds(new Set());
      setCustomMessage('');
      fetchDefaulters();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reminders');
    } finally {
      setSendingBulk(false);
    }
  };

  const sendToFiltered = async () => {
    if (!customMessage) {
      toast.error('Please enter a message');
      return;
    }

    setSendingBulk(true);
    try {
      const filterParams: any = { message: customMessage };
      if (filters.min_days) filterParams.min_days_overdue = parseInt(filters.min_days);
      if (filters.max_reminder_count) filterParams.max_reminder_count = parseInt(filters.max_reminder_count);
      if (filters.min_amount) filterParams.min_amount = parseFloat(filters.min_amount);
      if (filters.ward_id) filterParams.ward_id = parseInt(filters.ward_id);
      if (filters.business_size) filterParams.business_size = filters.business_size;

      const res = await apiClient.post('/defaulters/bulk-filtered', filterParams);

      toast.success(`Sent ${res.data.sent} reminders to filtered defaulters`);
      setShowBulkModal(false);
      setCustomMessage('');
      fetchDefaulters();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reminders');
    } finally {
      setSendingBulk(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getOverdueColor = (days: number) => {
    if (days > 90) return 'text-red-600 bg-red-50';
    if (days > 60) return 'text-orange-600 bg-orange-50';
    if (days > 30) return 'text-amber-600 bg-amber-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-teal-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <EnhancedTenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={28} />
              Defaulters Management
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Track overdue payments and send bulk SMS reminders
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFiltersModal(true)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
            >
              <Filter size={18} />
              Filters
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <Send size={18} />
              Send Bulk SMS ({selectedIds.size})
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-sm">Total Defaulters</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.total_defaulters}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-sm">Total Outstanding</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.total_outstanding)}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-sm">Never Reminded</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{stats.never_reminded}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-sm">Over 90 Days</p>
              <p className="text-3xl font-bold text-red-700 mt-1">{stats.by_days_overdue?.over_90 || 0}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by business name or owner..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => fetchDefaulters()}
              className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition"
            >
              <RefreshCw size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Defaulters Table */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-4">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 hover:bg-gray-200 rounded transition"
                    >
                      {selectedIds.size === defaulters.length && defaulters.length > 0 ? (
                        <CheckSquare size={20} className="text-teal-600" />
                      ) : (
                        <Square size={20} className="text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="text-left px-4 py-4 text-sm font-semibold text-gray-600">Business</th>
                  <th className="text-left px-4 py-4 text-sm font-semibold text-gray-600">Outstanding</th>
                  <th className="text-left px-4 py-4 text-sm font-semibold text-gray-600">Days Overdue</th>
                  <th className="text-left px-4 py-4 text-sm font-semibold text-gray-600">Contact</th>
                  <th className="text-left px-4 py-4 text-sm font-semibold text-gray-600">Reminders</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <RefreshCw className="animate-spin" size={20} />
                        Loading defaulters...
                      </div>
                    </td>
                  </tr>
                ) : defaulters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      No defaulters found
                    </td>
                  </tr>
                ) : (
                  defaulters.map((defaulter) => (
                    <tr key={defaulter.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-4">
                        <button
                          onClick={() => toggleSelect(defaulter.id)}
                          className="p-1 hover:bg-gray-200 rounded transition"
                        >
                          {selectedIds.has(defaulter.id) ? (
                            <CheckSquare size={20} className="text-teal-600" />
                          ) : (
                            <Square size={20} className="text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{defaulter.business?.name}</p>
                          <p className="text-sm text-gray-500">{defaulter.business?.owner_name}</p>
                          {defaulter.business?.ward && (
                            <p className="text-xs text-gray-400">{defaulter.business.ward.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">{formatCurrency(defaulter.amount_due)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOverdueColor(defaulter.days_overdue)}`}>
                          {defaulter.days_overdue} days
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone size={14} />
                          {defaulter.business?.owner_phone || defaulter.business?.phone || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">
                            {defaulter.reminder_count}x sent
                          </span>
                          {defaulter.last_reminder_sent && (
                            <span className="text-xs text-gray-400">
                              {new Date(defaulter.last_reminder_sent).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={async () => {
                            try {
                              await apiClient.post(`/defaulters/${defaulter.id}/remind`);
                              toast.success('Reminder sent');
                              fetchDefaulters();
                            } catch (error) {
                              toast.error('Failed to send reminder');
                            }
                          }}
                          className="px-3 py-1.5 bg-teal-50 text-teal-600 rounded-lg text-sm hover:bg-teal-100 transition"
                        >
                          Send SMS
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total > pagination.per_page && (
            <div className="px-4 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.per_page) + 1} to {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page * pagination.per_page >= pagination.total}
                  className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk SMS Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Send Bulk SMS</h2>
                <button onClick={() => setShowBulkModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Selection Info */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <p className="text-teal-700 font-medium">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} defaulters selected`
                    : 'Send to all matching current filters'}
                </p>
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Template (Optional)
                </label>
                <select
                  onChange={(e) => {
                    const template = templates.find(t => t.id === parseInt(e.target.value));
                    if (template) setCustomMessage(template.content);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Choose a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Dear {name}, you have an outstanding balance of NGN{amount}. Please make payment to avoid penalties. - {tenant_name}"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 resize-none"
                />
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>Available: {'{name}'}, {'{business_name}'}, {'{amount}'}, {'{days_overdue}'}</span>
                  <span>{customMessage.length}/500</span>
                </div>
              </div>

              {/* Preview Button */}
              {customMessage && selectedIds.size > 0 && (
                <button
                  onClick={previewMessage}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2"
                >
                  <Eye size={18} />
                  Preview Message
                </button>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={selectedIds.size > 0 ? sendBulkSMS : sendToFiltered}
                disabled={sendingBulk || (!customMessage && selectedIds.size === 0)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingBulk ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send SMS
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Message Preview</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{previewResult.preview}</p>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{previewResult.character_count} characters</span>
                <span>{previewResult.sms_count} SMS segment(s)</span>
              </div>
              {previewResult.recipient && (
                <div className="bg-teal-50 rounded-xl p-3 text-sm">
                  <p className="font-medium text-teal-700">Sample recipient: {previewResult.recipient.name}</p>
                  <p className="text-teal-600">{previewResult.recipient.phone}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Modal */}
      {showFiltersModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Filter Defaulters</h2>
                <button onClick={() => setShowFiltersModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Days Overdue</label>
                <input
                  type="number"
                  value={filters.min_days}
                  onChange={(e) => setFilters(prev => ({ ...prev, min_days: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="e.g., 30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Reminder Count</label>
                <input
                  type="number"
                  value={filters.max_reminder_count}
                  onChange={(e) => setFilters(prev => ({ ...prev, max_reminder_count: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="e.g., 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Outstanding Amount</label>
                <input
                  type="number"
                  value={filters.min_amount}
                  onChange={(e) => setFilters(prev => ({ ...prev, min_amount: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="e.g., 50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Size</label>
                <select
                  value={filters.business_size}
                  onChange={(e) => setFilters(prev => ({ ...prev, business_size: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                >
                  <option value="">All Sizes</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    min_days: '',
                    max_reminder_count: '',
                    min_amount: '',
                    ward_id: '',
                    business_size: '',
                    status: '',
                  });
                  setShowFiltersModal(false);
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-xl"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </EnhancedTenantLayout>
  );
}
