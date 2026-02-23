'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TenantLayout from '@/components/TenantLayout';
import apiClient from '@/lib/api';

interface RevenuePoint {
  id: number;
  name: string;
  code: string;
  description: string;
  type: string;
  ward: { id: number; name: string };
  department?: { id: number; name: string };
  closing_frequency: string;
  address: string;
  is_active: boolean;
}

interface Ward {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

export default function RevenuePointsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [points, setPoints] = useState<RevenuePoint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState<RevenuePoint | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    type: 'market',
    ward_id: '',
    department_id: '',
    closing_frequency: 'daily',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const pointTypes = [
    { value: 'market', label: 'Market', icon: '🏪' },
    { value: 'park', label: 'Park', icon: '🚌' },
    { value: 'motor_park', label: 'Motor Park', icon: '🚗' },
    { value: 'slaughter', label: 'Slaughter House', icon: '🥩' },
    { value: 'loading_bay', label: 'Loading Bay', icon: '📦' },
    { value: 'toll_gate', label: 'Toll Gate', icon: '🚧' },
    { value: 'other', label: 'Other', icon: '📍' },
  ];

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchData();
    }
  }, [user, isLoading, router]);

  const fetchData = async () => {
    try {
      const [pointsRes, wardsRes, deptsRes] = await Promise.all([
        apiClient.get('/revenue-points'),
        apiClient.get('/wards'),
        apiClient.get('/departments'),
      ]);
      setPoints(pointsRes.data);
      setWards(wardsRes.data);
      setDepartments(deptsRes.data);
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
      if (editingPoint) {
        await apiClient.put(`/revenue-points/${editingPoint.id}`, formData);
      } else {
        await apiClient.post('/revenue-points', formData);
      }
      setShowModal(false);
      setEditingPoint(null);
      setFormData({
        name: '', code: '', description: '', type: 'market',
        ward_id: '', department_id: '', closing_frequency: 'daily', address: '',
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save revenue point');
    } finally {
      setSubmitting(false);
    }
  };

  const editPoint = (point: RevenuePoint) => {
    setEditingPoint(point);
    setFormData({
      name: point.name,
      code: point.code,
      description: point.description || '',
      type: point.type,
      ward_id: point.ward?.id?.toString() || '',
      department_id: point.department?.id?.toString() || '',
      closing_frequency: point.closing_frequency,
      address: point.address || '',
    });
    setShowModal(true);
  };

  const toggleStatus = async (pointId: number, currentStatus: boolean) => {
    try {
      await apiClient.put(`/revenue-points/${pointId}`, { is_active: !currentStatus });
      fetchData();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const deletePoint = async (pointId: number) => {
    if (!confirm('Are you sure you want to delete this revenue point?')) return;
    try {
      await apiClient.delete(`/revenue-points/${pointId}`);
      fetchData();
    } catch (error) {
      alert('Failed to delete revenue point');
    }
  };

  const getTypeIcon = (type: string) => {
    return pointTypes.find(t => t.value === type)?.icon || '📍';
  };

  const getTypeLabel = (type: string) => {
    return pointTypes.find(t => t.value === type)?.label || type;
  };

  const filteredPoints = points.filter(point => {
    const matchesSearch = point.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         point.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || point.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isLoading || loading) {
    return (
      <TenantLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Revenue Points</h2>
          <p className="text-gray-600 mt-1">Manage collection locations (markets, parks, etc.)</p>
        </div>
        <button
          onClick={() => { setEditingPoint(null); setFormData({ name: '', code: '', description: '', type: 'market', ward_id: '', department_id: '', closing_frequency: 'daily', address: '' }); setShowModal(true); }}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-lg font-semibold flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Revenue Point</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
          <p className="text-gray-500 text-xs font-medium">Total Points</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{points.length}</p>
        </div>
        {pointTypes.slice(0, 6).map(type => (
          <div key={type.value} className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
            <p className="text-gray-500 text-xs font-medium flex items-center">
              <span className="mr-1">{type.icon}</span> {type.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {points.filter(p => p.type === type.value).length}
            </p>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          {pointTypes.map(type => (
            <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
          ))}
        </select>
      </div>

      {/* Points Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPoints.map((point) => (
          <div
            key={point.id}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                  {getTypeIcon(point.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{point.name}</h3>
                  <p className="text-xs text-gray-500">{point.code}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                point.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {point.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {point.ward?.name || 'No ward'}
              </div>
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
                {point.department?.name || 'No department'}
              </div>
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {point.closing_frequency === 'daily' ? 'Daily Closing' : 'Weekly Closing'}
              </div>
            </div>

            <div className="flex space-x-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => editPoint(point)}
                className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
              >
                Edit
              </button>
              <button
                onClick={() => toggleStatus(point.id, point.is_active)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition ${
                  point.is_active
                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                    : 'text-green-600 bg-green-50 hover:bg-green-100'
                }`}
              >
                {point.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => deletePoint(point.id)}
                className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredPoints.length === 0 && (
        <div className="text-center py-12 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50">
          <p className="text-gray-500">No revenue points found. Create your first revenue point to get started.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {editingPoint ? 'Edit Revenue Point' : 'Add Revenue Point'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Central Market"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="MKT001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {pointTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                  <select
                    required
                    value={formData.ward_id}
                    onChange={(e) => setFormData({ ...formData, ward_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Ward</option>
                    {wards.map(ward => (
                      <option key={ward.id} value={ward.id}>{ward.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Frequency</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="daily"
                        checked={formData.closing_frequency === 'daily'}
                        onChange={(e) => setFormData({ ...formData, closing_frequency: e.target.value })}
                        className="mr-2"
                      />
                      <span className="text-sm">Daily</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="weekly"
                        checked={formData.closing_frequency === 'weekly'}
                        onChange={(e) => setFormData({ ...formData, closing_frequency: e.target.value })}
                        className="mr-2"
                      />
                      <span className="text-sm">Weekly</span>
                    </label>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Location address"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingPoint(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 font-semibold"
                >
                  {submitting ? 'Saving...' : (editingPoint ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
