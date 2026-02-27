'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface BusinessCategory {
  id: number;
  name: string;
  code: string;
  parent_id: number | null;
  level: number;
  requires_subcategory: boolean;
  size_tariffs: Record<string, number> | null;
  children?: BusinessCategory[];
}

interface BusinessSize {
  id: number;
  name: string;
  code: string;
  description: string;
  criteria: {
    min_employees?: number;
    max_employees?: number;
    min_revenue?: number;
    max_revenue?: number;
  };
  default_multiplier: number;
}

interface Ward {
  id: number;
  name: string;
  code: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
}

interface BusinessFormData {
  business_name: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  address: string;
  ward_id: string;
  department_id: string;
  category_id: string;
  subcategory_id: string;
  size_id: string;
  employee_count: string;
  annual_revenue: string;
  registration_number: string;
  tax_id: string;
  license_expiry: string;
  operating_hours: {
    weekdays: { open: string; close: string };
    weekends: { open: string; close: string };
  };
}

// Category Icons
const CATEGORY_ICONS: Record<string, string> = {
  'FUE': '⛽',
  'SCH': '🏫',
  'HOS': '🏥',
  'BNK': '🏦',
  'HTL': '🏨',
  'TEL': '📡',
  'MKT': '🏪',
  'RES': '🍽️',
  'TRN': '🚌',
  'MFG': '🏭',
};

export default function EnhancedBusinessRegistration() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  
  // Data states
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [sizes, setSizes] = useState<BusinessSize[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<BusinessFormData>({
    business_name: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    address: '',
    ward_id: '',
    department_id: '',
    category_id: '',
    subcategory_id: '',
    size_id: '',
    employee_count: '',
    annual_revenue: '',
    registration_number: '',
    tax_id: '',
    license_expiry: '',
    operating_hours: {
      weekdays: { open: '08:00', close: '18:00' },
      weekends: { open: '09:00', close: '14:00' },
    },
  });
  
  // Derived states
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | null>(null);
  const [subcategories, setSubcategories] = useState<BusinessCategory[]>([]);
  const [estimatedTariff, setEstimatedTariff] = useState<number>(0);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchData();
    }
  }, [user, isLoading]);

  const fetchData = async () => {
    try {
      const [catRes, sizeRes, wardRes, deptRes] = await Promise.all([
        apiClient.get('/business-categories'),
        apiClient.get('/business-sizes'),
        apiClient.get('/wards'),
        apiClient.get('/departments'),
      ]);
      
      // Build category tree
      const allCategories = catRes.data.data || catRes.data || [];
      const rootCategories = allCategories.filter((c: BusinessCategory) => !c.parent_id);
      rootCategories.forEach((cat: BusinessCategory) => {
        cat.children = allCategories.filter((c: BusinessCategory) => c.parent_id === cat.id);
      });
      
      setCategories(rootCategories);
      setSizes(sizeRes.data.data || sizeRes.data || []);
      setWards(wardRes.data.data || wardRes.data || []);
      setDepartments(deptRes.data.data || deptRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data', error);
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: BusinessCategory) => {
    setFormData({ ...formData, category_id: String(category.id), subcategory_id: '' });
    setSelectedCategory(category);
    setSubcategories(category.children || []);
    updateEstimatedTariff(category.id, formData.size_id ? parseInt(formData.size_id) : null);
  };

  const handleSubcategorySelect = (subcategory: BusinessCategory) => {
    setFormData({ ...formData, subcategory_id: String(subcategory.id) });
    updateEstimatedTariff(parseInt(formData.category_id), formData.size_id ? parseInt(formData.size_id) : null, subcategory);
  };

  const handleSizeSelect = (size: BusinessSize) => {
    setFormData({ ...formData, size_id: String(size.id) });
    updateEstimatedTariff(
      formData.category_id ? parseInt(formData.category_id) : null,
      size.id
    );
  };

  const updateEstimatedTariff = (categoryId: number | null, sizeId: number | null, subcategory?: BusinessCategory) => {
    if (!categoryId || !sizeId) {
      setEstimatedTariff(0);
      return;
    }

    const category = subcategory || categories.find(c => c.id === categoryId);
    const size = sizes.find(s => s.id === sizeId);
    
    if (category?.size_tariffs && size) {
      const baseTariff = category.size_tariffs[size.code.toLowerCase()] || 0;
      setEstimatedTariff(baseTariff * size.default_multiplier);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!formData.category_id) {
          toast.error('Please select a business category');
          return false;
        }
        if (selectedCategory?.requires_subcategory && !formData.subcategory_id) {
          toast.error('Please select a subcategory');
          return false;
        }
        if (!formData.size_id) {
          toast.error('Please select a business size');
          return false;
        }
        return true;
      case 2:
        if (!formData.business_name || !formData.owner_name || !formData.owner_phone) {
          toast.error('Please fill all required fields');
          return false;
        }
        return true;
      case 3:
        if (!formData.ward_id || !formData.department_id || !formData.address) {
          toast.error('Please fill all required fields');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        ward_id: parseInt(formData.ward_id),
        department_id: parseInt(formData.department_id),
        category_id: parseInt(formData.category_id),
        subcategory_id: formData.subcategory_id ? parseInt(formData.subcategory_id) : null,
        size_id: parseInt(formData.size_id),
        employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
        annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue) : null,
      };
      
      const response = await apiClient.post('/businesses', payload);
      toast.success('Business registered successfully!');
      router.push(`/businesses/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to register business');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Business Registration</h1>
          <p className="text-gray-600 mt-2">Register a new business in FlexCloud</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${
                step >= s 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {s}
              </div>
              {s < 4 && (
                <div className={`w-16 h-1 mx-2 rounded ${
                  step > s ? 'bg-blue-600' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex justify-center gap-4 text-xs text-gray-500 mb-8">
          <span className={step >= 1 ? 'text-blue-600 font-medium' : ''}>Category & Size</span>
          <span className={step >= 2 ? 'text-blue-600 font-medium' : ''}>Business Info</span>
          <span className={step >= 3 ? 'text-blue-600 font-medium' : ''}>Location</span>
          <span className={step >= 4 ? 'text-blue-600 font-medium' : ''}>Review</span>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden">
          {/* Step 1: Category & Size */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Business Category & Size</h2>
              
              {/* Category Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">Business Category *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category)}
                      className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                        formData.category_id === String(category.id)
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="text-2xl mb-2 block">
                        {CATEGORY_ICONS[category.code] || '🏢'}
                      </span>
                      <span className="font-medium text-gray-900 text-sm">{category.name}</span>
                      {category.requires_subcategory && (
                        <span className="text-xs text-blue-600 block mt-1">Has subtypes</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategory Selection */}
              {selectedCategory?.requires_subcategory && subcategories.length > 0 && (
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {selectedCategory.name} Type *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleSubcategorySelect(sub)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.subcategory_id === String(sub.id)
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <span className="font-medium text-gray-900">{sub.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">Business Size *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {sizes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => handleSizeSelect(size)}
                      className={`p-5 rounded-xl border-2 transition-all text-center ${
                        formData.size_id === String(size.id)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <span className={`text-3xl font-bold block mb-1 ${
                        size.code === 'SM' ? 'text-blue-600' :
                        size.code === 'MD' ? 'text-yellow-600' :
                        size.code === 'LG' ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {size.code}
                      </span>
                      <span className="font-medium text-gray-900">{size.name}</span>
                      <p className="text-xs text-gray-500 mt-1">{size.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimated Tariff */}
              {estimatedTariff > 0 && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700">Estimated Annual Levy</p>
                      <p className="text-2xl font-bold text-green-800">{formatCurrency(estimatedTariff)}</p>
                    </div>
                    <div className="text-right text-sm text-green-600">
                      <p>Based on category & size</p>
                      <p>Subject to verification</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Business Information */}
          {step === 2 && (
            <div className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Business Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => handleInputChange('business_name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter business name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => handleInputChange('owner_name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Full name of owner"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.owner_phone}
                    onChange={(e) => handleInputChange('owner_phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="08012345678"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.owner_email}
                    onChange={(e) => handleInputChange('owner_email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={(e) => handleInputChange('registration_number', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="CAC/BN/12345"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (TIN)</label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => handleInputChange('tax_id', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tax identification number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Count</label>
                  <input
                    type="number"
                    value={formData.employee_count}
                    onChange={(e) => handleInputChange('employee_count', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Number of employees"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Revenue (₦)</label>
                  <input
                    type="number"
                    value={formData.annual_revenue}
                    onChange={(e) => handleInputChange('annual_revenue', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Estimated annual revenue"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Location & Assignment</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward *</label>
                  <select
                    value={formData.ward_id}
                    onChange={(e) => handleInputChange('ward_id', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select ward</option>
                    {wards.map((ward) => (
                      <option key={ward.id} value={ward.id}>{ward.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => handleInputChange('department_id', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Address *</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Full address of the business premises"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry Date</label>
                  <input
                    type="date"
                    value={formData.license_expiry}
                    onChange={(e) => handleInputChange('license_expiry', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Review & Submit</h2>
              
              <div className="space-y-6">
                {/* Category & Size */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-700 mb-3">Category & Size</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Category:</span>
                      <span className="ml-2 font-medium">{categories.find(c => c.id === parseInt(formData.category_id))?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <span className="ml-2 font-medium">{sizes.find(s => s.id === parseInt(formData.size_id))?.name}</span>
                    </div>
                  </div>
                </div>
                
                {/* Business Info */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-700 mb-3">Business Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Name:</span> <span className="ml-2 font-medium">{formData.business_name}</span></div>
                    <div><span className="text-gray-500">Owner:</span> <span className="ml-2 font-medium">{formData.owner_name}</span></div>
                    <div><span className="text-gray-500">Phone:</span> <span className="ml-2 font-medium">{formData.owner_phone}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="ml-2 font-medium">{formData.owner_email || '-'}</span></div>
                  </div>
                </div>
                
                {/* Location */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-700 mb-3">Location</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Ward:</span> <span className="ml-2 font-medium">{wards.find(w => w.id === parseInt(formData.ward_id))?.name}</span></div>
                    <div><span className="text-gray-500">Department:</span> <span className="ml-2 font-medium">{departments.find(d => d.id === parseInt(formData.department_id))?.name}</span></div>
                    <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="ml-2 font-medium">{formData.address}</span></div>
                  </div>
                </div>
                
                {/* Estimated Tariff */}
                {estimatedTariff > 0 && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700">Estimated Annual Levy</p>
                        <p className="text-2xl font-bold text-green-800">{formatCurrency(estimatedTariff)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="px-8 py-6 bg-gray-50 flex justify-between">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition font-medium"
              >
                ← Back
              </button>
            ) : (
              <button
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition font-medium"
              >
                Cancel
              </button>
            )}
            
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-medium shadow-lg"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition font-medium shadow-lg disabled:opacity-50"
              >
                {submitting ? 'Registering...' : 'Register Business'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
