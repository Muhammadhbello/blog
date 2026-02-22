'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';

interface ConsultantAssignment {
  id: number;
  consultant: {
    id: number;
    name: string;
    email: string;
  };
  revenue_item: {
    id: number;
    name: string;
  } | null;
  revenue_point: {
    id: number;
    location_name: string;
  } | null;
  commission_rate: number;
  status: string;
}

interface Consultant {
  id: number;
  name: string;
  email: string;
}

interface RevenueItem {
  id: number;
  name: string;
}

export default function ConsultantsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [assignments, setAssignments] = useState<ConsultantAssignment[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [revenueItems, setRevenueItems] = useState<RevenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    consultant_id: '',
    revenue_item_id: '',
    commission_rate: '5.00',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      if (user.role === 'consultant') {
        fetchConsultantData();
      } else {
        fetchData();
      }
    }
  }, [user, isLoading, router]);

  const fetchData = async () => {
    try {
      const [assignmentsRes, consultantsRes, itemsRes] = await Promise.all([
        apiClient.get('/consultants/assignments'),
        apiClient.get('/consultants'),
        apiClient.get('/revenue-items'),
      ]);
      setAssignments(assignmentsRes.data);
      setConsultants(consultantsRes.data);
      setRevenueItems(itemsRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsultantData = async () => {
    try {
      const response = await apiClient.get('/consultants/scoped-data');
      setAssignments(response.data.assignments);
    } catch (error) {
      console.error('Failed to fetch consultant data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiClient.post('/consultants/assign', {
        ...formData,
        tenant_id: user?.tenant_id,
      });

      toast.success('Consultant Assigned!', {
        description: 'Assignment created successfully',
      });

      setShowModal(false);
      setFormData({
        consultant_id: '',
        revenue_item_id: '',
        commission_rate: '5.00',
      });
      fetchData();
    } catch (error: any) {
      toast.error('Assignment failed', {
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

  const isConsultant = user?.role === 'consultant';

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
              <span className="text-gray-700 font-medium">
                {isConsultant ? 'My Assignments' : 'Consultant Management'}
              </span>
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
            <h1 className="text-3xl font-bold text-gray-900">
              {isConsultant ? 'My Assignments' : 'Consultant Management'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isConsultant 
                ? 'View your assigned revenue items and commission rates' 
                : 'Assign consultants to revenue items and track performance'}
            </p>
          </div>
          {!isConsultant && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
            >
              + Assign Consultant
            </button>
          )}
        </div>

        {/* Consultant View - Stats */}
        {isConsultant && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
              <p className="text-sm text-gray-600 mb-1">Active Assignments</p>
              <p className="text-3xl font-bold text-blue-600">
                {assignments.filter(a => a.status === 'active').length}
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
              <p className="text-sm text-gray-600 mb-1">Avg Commission Rate</p>
              <p className="text-3xl font-bold text-green-600">
                {assignments.length > 0
                  ? (assignments.reduce((sum, a) => sum + parseFloat(a.commission_rate.toString()), 0) / assignments.length).toFixed(1)
                  : 0}%
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
              <p className="text-sm text-gray-600 mb-1">Revenue Items</p>
              <p className="text-3xl font-bold text-purple-600">{assignments.length}</p>
            </div>
          </div>
        )}

        {/* Assignments List */}
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {!isConsultant && (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {assignment.consultant.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      {!isConsultant && (
                        <h3 className="text-lg font-semibold text-gray-900">{assignment.consultant.name}</h3>
                      )}
                      <p className="text-sm text-gray-600">{isConsultant ? '' : assignment.consultant.email}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${
                      assignment.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {assignment.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500">Revenue Item</p>
                      <p className="text-sm font-medium text-gray-900">
                        {assignment.revenue_item?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Commission Rate</p>
                      <p className="text-sm font-bold text-green-600">{assignment.commission_rate}%</p>
                    </div>
                    {assignment.revenue_point && (
                      <div>
                        <p className="text-xs text-gray-500">Revenue Point</p>
                        <p className="text-sm font-medium text-gray-900">{assignment.revenue_point.location_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {assignments.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500">
              {isConsultant 
                ? 'No assignments yet. Contact your administrator.' 
                : 'No consultant assignments. Create your first assignment to get started.'}
            </p>
          </div>
        )}
      </main>

      {/* Assign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Assign Consultant</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consultant</label>
                <select
                  required
                  value={formData.consultant_id}
                  onChange={(e) => setFormData({ ...formData, consultant_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Consultant</option>
                  {consultants.map((consultant) => (
                    <option key={consultant.id} value={consultant.id}>
                      {consultant.name} ({consultant.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Revenue Item</label>
                <select
                  required
                  value={formData.revenue_item_id}
                  onChange={(e) => setFormData({ ...formData, revenue_item_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Revenue Item</option>
                  {revenueItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5.00"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The consultant will only see data for assigned revenue items.
                  They cannot access other revenue streams.
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
                  {submitting ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
