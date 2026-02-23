'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import Link from 'next/link';

interface Business {
  id: number;
  business_name: string;
  registration_number: string;
  owner_name: string;
  business_type: string;
  business_category: string;
  size: string;
  ward_id: number;
  department_id: number;
  ward_name: string;
  department_name: string;
}

interface Ward {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

interface RevenueItem {
  id: number;
  name: string;
  default_amount: number;
  category_name?: string;
}

interface SelectedItem {
  revenue_item_id: number;
  name: string;
  amount: number;
  description: string;
}

interface PreviewItem {
  business_id: number;
  business_name: string;
  size: string;
  amount: number;
}

interface GenerationResult {
  success: Array<{
    business_id: number;
    business_name: string;
    invoice_id: number;
    invoice_number: string;
    amount: number;
  }>;
  failed: Array<{
    business_id: number;
    message: string;
  }>;
}

export default function BulkInvoicePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  
  // Data states
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [revenueItems, setRevenueItems] = useState<RevenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [filters, setFilters] = useState({
    ward_id: '',
    department_id: '',
    size: '',
    business_type: '',
    exclude_pending: false,
  });
  
  // Selection states
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<number[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Tariff states
  const [applyTariffBySize, setApplyTariffBySize] = useState(false);
  const [tariffRules, setTariffRules] = useState({
    small: 0,
    medium: 0,
    large: 0,
  });
  
  // Invoice config
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [autoSendSms, setAutoSendSms] = useState(false);
  
  // Preview & Generation states
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [previewSummary, setPreviewSummary] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  // Summary
  const [summary, setSummary] = useState({
    total: 0,
    by_size: {} as Record<string, number>,
    by_ward: {} as Record<string, number>,
    by_type: {} as Record<string, number>,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchInitialData();
    }
  }, [user, isLoading, router]);

  const fetchInitialData = async () => {
    try {
      const [wardsRes, deptsRes, itemsRes] = await Promise.all([
        apiClient.get('/wards'),
        apiClient.get('/departments'),
        apiClient.get('/revenue-items'),
      ]);
      setWards(wardsRes.data.data || wardsRes.data);
      setDepartments(deptsRes.data.data || deptsRes.data);
      setRevenueItems(itemsRes.data.data || itemsRes.data);
      
      // Fetch businesses with no filter initially
      await fetchBusinesses({});
    } catch (error) {
      console.error('Failed to fetch initial data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async (filterParams: any) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
      
      const res = await apiClient.get(`/bulk-invoices/businesses?${params.toString()}`);
      setBusinesses(res.data.businesses || []);
      setSummary(res.data.summary || { total: 0, by_size: {}, by_ward: {}, by_type: {} });
      setSelectedBusinessIds([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Failed to fetch businesses', error);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchBusinesses(newFilters);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedBusinessIds([]);
    } else {
      setSelectedBusinessIds(businesses.map(b => b.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectBusiness = (id: number) => {
    if (selectedBusinessIds.includes(id)) {
      setSelectedBusinessIds(selectedBusinessIds.filter(bid => bid !== id));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedBusinessIds, id];
      setSelectedBusinessIds(newSelected);
      if (newSelected.length === businesses.length) {
        setSelectAll(true);
      }
    }
  };

  const handleAddRevenueItem = (item: RevenueItem) => {
    if (selectedItems.find(si => si.revenue_item_id === item.id)) {
      return; // Already added
    }
    setSelectedItems([
      ...selectedItems,
      {
        revenue_item_id: item.id,
        name: item.name,
        amount: item.default_amount,
        description: item.name,
      },
    ]);
    
    // Set default tariff rules
    if (!tariffRules.small && !tariffRules.medium && !tariffRules.large) {
      setTariffRules({
        small: item.default_amount,
        medium: item.default_amount * 1.5,
        large: item.default_amount * 2,
      });
    }
  };

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems(selectedItems.filter(i => i.revenue_item_id !== itemId));
  };

  const handleItemAmountChange = (itemId: number, amount: number) => {
    setSelectedItems(
      selectedItems.map(item =>
        item.revenue_item_id === itemId ? { ...item, amount } : item
      )
    );
  };

  const handlePreview = async () => {
    if (selectedBusinessIds.length === 0) {
      alert('Please select at least one business');
      return;
    }
    if (selectedItems.length === 0) {
      alert('Please add at least one revenue item');
      return;
    }

    try {
      const res = await apiClient.post('/bulk-invoices/preview', {
        business_ids: selectedBusinessIds,
        revenue_items: selectedItems.map(item => ({
          revenue_item_id: item.revenue_item_id,
          amount: item.amount,
        })),
        apply_tariff_by_size: applyTariffBySize,
        tariff_rules: applyTariffBySize ? tariffRules : null,
      });
      
      setPreview(res.data.preview || []);
      setPreviewSummary(res.data.summary || null);
      setShowPreview(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to generate preview');
    }
  };

  const handleGenerate = async () => {
    if (!dueDate) {
      alert('Please select a due date');
      return;
    }

    setGenerating(true);
    try {
      const res = await apiClient.post('/bulk-invoices/generate', {
        business_ids: selectedBusinessIds,
        revenue_items: selectedItems.map(item => ({
          revenue_item_id: item.revenue_item_id,
          amount: item.amount,
          description: item.description,
        })),
        due_date: dueDate,
        apply_tariff_by_size: applyTariffBySize,
        tariff_rules: applyTariffBySize ? tariffRules : null,
        notes,
        auto_send_sms: autoSendSms,
      });
      
      setResults(res.data.results);
      setShowPreview(false);
      setShowResults(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to generate invoices');
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getSizeColor = (size: string) => {
    switch (size) {
      case 'small':
        return 'bg-blue-100 text-blue-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'large':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
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
              <span className="text-gray-700 font-medium">Bulk Invoice Generation</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/invoices" className="text-gray-600 hover:text-gray-900">← Back to Invoices</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Bulk Invoice Generation</h1>
          <p className="text-gray-600 mt-1">Generate invoices for multiple businesses at once</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Business Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Businesses</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                  <select
                    value={filters.ward_id}
                    onChange={(e) => handleFilterChange('ward_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="filter-ward"
                  >
                    <option value="">All Wards</option>
                    {wards.map((ward) => (
                      <option key={ward.id} value={ward.id}>{ward.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={filters.department_id}
                    onChange={(e) => handleFilterChange('department_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="filter-department"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                  <select
                    value={filters.size}
                    onChange={(e) => handleFilterChange('size', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="filter-size"
                  >
                    <option value="">All Sizes</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                  <select
                    value={filters.business_type}
                    onChange={(e) => handleFilterChange('business_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="filter-type"
                  >
                    <option value="">All Types</option>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="service">Service</option>
                    <option value="manufacturing">Manufacturing</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={filters.exclude_pending}
                    onChange={(e) => handleFilterChange('exclude_pending', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Exclude businesses with pending/unpaid invoices</span>
                </label>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/80 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                <p className="text-sm text-gray-600">Total Businesses</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm text-blue-600">Small</p>
                <p className="text-2xl font-bold text-blue-700">{summary.by_size?.small || 0}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                <p className="text-sm text-yellow-600">Medium</p>
                <p className="text-2xl font-bold text-yellow-700">{summary.by_size?.medium || 0}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p className="text-sm text-purple-600">Large</p>
                <p className="text-2xl font-bold text-purple-700">{summary.by_size?.large || 0}</p>
              </div>
            </div>

            {/* Business List */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Select Businesses ({selectedBusinessIds.length} selected)
                </h2>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  data-testid="select-all-btn"
                >
                  {selectAll ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-2">
                {businesses.map((business) => (
                  <div
                    key={business.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                      selectedBusinessIds.includes(business.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSelectBusiness(business.id)}
                    data-testid={`business-item-${business.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedBusinessIds.includes(business.id)}
                        onChange={() => {}}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{business.business_name}</p>
                        <p className="text-sm text-gray-500">
                          {business.owner_name} • {business.registration_number}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getSizeColor(business.size)}`}>
                        {business.size}
                      </span>
                      {business.ward_name && (
                        <span className="text-xs text-gray-500">{business.ward_name}</span>
                      )}
                    </div>
                  </div>
                ))}
                
                {businesses.length === 0 && (
                  <p className="text-center py-8 text-gray-500">No businesses found matching your filters</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Invoice Configuration */}
          <div className="space-y-6">
            {/* Revenue Items */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Items</h2>
              
              <div className="mb-4">
                <select
                  onChange={(e) => {
                    const itemId = parseInt(e.target.value);
                    const item = revenueItems.find(i => i.id === itemId);
                    if (item) handleAddRevenueItem(item);
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="add-revenue-item"
                >
                  <option value="">+ Add Revenue Item</option>
                  {revenueItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {formatCurrency(item.default_amount)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {selectedItems.map((item) => (
                  <div key={item.revenue_item_id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                      <button
                        onClick={() => handleRemoveItem(item.revenue_item_id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => handleItemAmountChange(item.revenue_item_id, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={applyTariffBySize}
                    />
                  </div>
                ))}
                
                {selectedItems.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No items added yet</p>
                )}
              </div>
            </div>

            {/* Tariff Configuration */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Tariff by Size</h2>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyTariffBySize}
                    onChange={(e) => setApplyTariffBySize(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {applyTariffBySize && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Small Business</label>
                    <input
                      type="number"
                      value={tariffRules.small}
                      onChange={(e) => setTariffRules({ ...tariffRules, small: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      data-testid="tariff-small"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-yellow-700 mb-1">Medium Business</label>
                    <input
                      type="number"
                      value={tariffRules.medium}
                      onChange={(e) => setTariffRules({ ...tariffRules, medium: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-yellow-200 bg-yellow-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      data-testid="tariff-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">Large Business</label>
                    <input
                      type="number"
                      value={tariffRules.large}
                      onChange={(e) => setTariffRules({ ...tariffRules, large: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-purple-200 bg-purple-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      data-testid="tariff-large"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Settings */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="due-date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes for invoices..."
                  />
                </div>
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={autoSendSms}
                    onChange={(e) => setAutoSendSms(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Send SMS notification to businesses</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handlePreview}
                disabled={selectedBusinessIds.length === 0 || selectedItems.length === 0}
                className="w-full px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="preview-btn"
              >
                Preview Invoices
              </button>
              <button
                onClick={handleGenerate}
                disabled={selectedBusinessIds.length === 0 || selectedItems.length === 0 || !dueDate || generating}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                data-testid="generate-btn"
              >
                {generating ? 'Generating...' : `Generate ${selectedBusinessIds.length} Invoices`}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Invoice Preview</h2>
              <p className="text-sm text-gray-600 mt-1">Review before generating</p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {previewSummary && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Businesses</p>
                      <p className="text-xl font-bold text-gray-900">{previewSummary.total_businesses}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(previewSummary.total_amount)}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                {preview.map((item) => (
                  <div key={item.business_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.business_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getSizeColor(item.size)}`}>
                        {item.size}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900">{formatCurrency(item.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              >
                Close
              </button>
              <button
                onClick={handleGenerate}
                disabled={!dueDate || generating}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
                data-testid="confirm-generate-btn"
              >
                {generating ? 'Generating...' : 'Confirm & Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResults && results && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Generation Results</h2>
              <p className="text-sm text-gray-600 mt-1">
                {results.success.length} successful, {results.failed.length} failed
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {results.success.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-green-700 mb-2">Successfully Generated</h3>
                  <div className="space-y-2">
                    {results.success.map((item) => (
                      <div key={item.invoice_id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <div>
                          <p className="font-medium text-gray-900">{item.business_name}</p>
                          <p className="text-sm text-green-600">{item.invoice_number}</p>
                        </div>
                        <p className="font-semibold text-green-700">{formatCurrency(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {results.failed.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-2">Failed</h3>
                  <div className="space-y-2">
                    {results.failed.map((item, idx) => (
                      <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="font-medium text-gray-900">Business ID: {item.business_id}</p>
                        <p className="text-sm text-red-600">{item.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => {
                  setShowResults(false);
                  setSelectedBusinessIds([]);
                  setSelectedItems([]);
                  setDueDate('');
                  setNotes('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              >
                Generate More
              </button>
              <Link
                href="/invoices"
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition text-center"
              >
                View All Invoices
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
