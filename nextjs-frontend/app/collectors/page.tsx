'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TenantLayout from '@/components/TenantLayout';
import apiClient from '@/lib/api';

interface CollectorAssignment {
  id: number;
  collector: { id: number; name: string; email: string; phone: string };
  ward: { id: number; name: string; code: string } | null;
  revenue_point: { id: number; name: string; code: string } | null;
  assigned_date: string;
  end_date: string | null;
  status: string;
  notes: string;
}

interface Collector {
  id: number;
  name: string;
  email: string;
  phone: string;
  collector_assignments_count: number;
}

interface Ward {
  id: number;
  name: string;
  code: string;
}

export default function CollectorsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [assignments, setAssignments] = useState<CollectorAssignment[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    collector_id: '',
    ward_id: '',
    assigned_date: new Date().toISOString().split('T')[0],
    notes: '',
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
      const [assignmentsRes, collectorsRes, wardsRes] = await Promise.all([
        apiClient.get('/tenant/collector-assignments'),
        apiClient.get('/tenant/collectors'),
        apiClient.get('/wards'),
      ]);
      setAssignments(assignmentsRes.data.data || assignmentsRes.data);
      setCollectors(collectorsRes.data);
      setWards(wardsRes.data);
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
      await apiClient.post('/tenant/collector-assignments', {
        ...formData,
        collector_id: parseInt(formData.collector_id),
        ward_id: formData.ward_id ? parseInt(formData.ward_id) : null,
      });
      setShowModal(false);
      setFormData({
        collector_id: '',
        ward_id: '',
        assigned_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiClient.put(`/tenant/collector-assignments/${id}`, { status });
      fetchData();
    } catch (error) {
      alert('Failed to update assignment');
    }
  };

  const deleteAssignment = async (id: number) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await apiClient.delete(`/tenant/collector-assignments/${id}`);
      fetchData();
    } catch (error) {
      alert('Failed to delete assignment');
    }
  };

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
          <h2 className="text-3xl font-bold text-gray-900">Collector Management</h2>
          <p className="text-gray-600 mt-1">Assign collectors to wards and revenue points</p>
        </div>
        {(user?.role === 'chairman' || user?.role === 'hod') && (
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-lg font-semibold flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Assign Collector</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
          <p className="text-gray-500 text-xs font-medium">Total Collectors</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{collectors.length}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
          <p className="text-gray-500 text-xs font-medium">Active Assignments</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {assignments.filter(a => a.status === 'active').length}
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
          <p className="text-gray-500 text-xs font-medium">Wards Covered</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {new Set(assignments.filter(a => a.ward).map(a => a.ward?.id)).size}
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
          <p className="text-gray-500 text-xs font-medium">Unassigned</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {collectors.filter(c => c.collector_assignments_count === 0).length}
          </p>
        </div>
      </div>

      {/* Collectors List */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Collectors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {collectors.map((collector) => (
            <div
              key={collector.id}
              className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-4 shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                  {collector.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{collector.name}</p>
                  <p className="text-xs text-gray-500 truncate">{collector.email}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {collector.collector_assignments_count} assignments
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  collector.collector_assignments_count > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {collector.collector_assignments_count > 0 ? 'Assigned' : 'Available'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignments List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Assignments</h3>
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Collector</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Ward</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Assigned Date</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          {assignment.collector.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{assignment.collector.name}</p>
                          <p className="text-xs text-gray-500">{assignment.collector.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {assignment.ward ? (
                        <div>
                          <p className="font-medium text-gray-900">{assignment.ward.name}</p>
                          <p className="text-xs text-gray-500">{assignment.ward.code}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(assignment.assigned_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        assignment.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : assignment.status === 'completed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        {assignment.status === 'active' && (
                          <button
                            onClick={() => updateStatus(assignment.id, 'completed')}
                            className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => deleteAssignment(assignment.id)}
                          className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {assignments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No assignments yet. Assign collectors to wards to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Assign Collector</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Collector</label>
                <select
                  required
                  value={formData.collector_id}
                  onChange={(e) => setFormData({ ...formData, collector_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a collector</option>
                  {collectors.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                <select
                  value={formData.ward_id}
                  onChange={(e) => setFormData({ ...formData, ward_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a ward</option>
                  {wards.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.assigned_date}
                  onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 font-semibold"
                >
                  {submitting ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
