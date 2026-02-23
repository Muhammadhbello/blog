'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TenantLayout from '@/components/TenantLayout';
import apiClient from '@/lib/api';

interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  head_user_id?: number;
  head_user?: { id: number; name: string; email: string };
  businesses_count?: number;
  revenue_points_count?: number;
  is_active: boolean;
  created_at: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function DepartmentsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    head_user_id: '',
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
      const [deptRes, usersRes] = await Promise.all([
        apiClient.get('/departments'),
        apiClient.get('/tenant/users').catch(() => ({ data: [] })),
      ]);
      setDepartments(deptRes.data);
      setUsers(usersRes.data.filter((u: User) => u.role === 'hod' || u.role === 'chairman' || u.role === 'treasurer'));
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
      const payload = {
        ...formData,
        head_user_id: formData.head_user_id ? parseInt(formData.head_user_id) : null,
      };

      if (editingDept) {
        await apiClient.put(`/departments/${editingDept.id}`, payload);
      } else {
        await apiClient.post('/departments', payload);
      }
      setShowModal(false);
      setEditingDept(null);
      setFormData({ name: '', code: '', description: '', head_user_id: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save department');
    } finally {
      setSubmitting(false);
    }
  };

  const editDepartment = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      head_user_id: dept.head_user_id?.toString() || '',
    });
    setShowModal(true);
  };

  const deleteDepartment = async (deptId: number) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await apiClient.delete(`/departments/${deptId}`);
      fetchData();
    } catch (error) {
      alert('Failed to delete department');
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-3xl font-bold text-gray-900">Departments</h2>
          <p className="text-gray-600 mt-1">Manage organization departments and assign heads</p>
        </div>
        <button
          onClick={() => { setEditingDept(null); setFormData({ name: '', code: '', description: '', head_user_id: '' }); setShowModal(true); }}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-lg font-semibold flex items-center space-x-2"
          data-testid="add-department-btn"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Department</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total</p>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">With HOD</p>
              <p className="text-2xl font-bold text-gray-900">{departments.filter(d => d.head_user_id).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">No HOD</p>
              <p className="text-2xl font-bold text-gray-900">{departments.filter(d => !d.head_user_id).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Available HODs</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search departments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-1/2 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="search-departments"
        />
      </div>

      {/* Departments Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="departments-table">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Department</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Code</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Head (HOD)</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Description</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDepartments.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50 transition" data-testid={`department-row-${dept.id}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {dept.name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{dept.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">{dept.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    {dept.head_user ? (
                      <div>
                        <p className="font-medium text-gray-900">{dept.head_user.name}</p>
                        <p className="text-xs text-gray-500">{dept.head_user.email}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-600 text-sm truncate max-w-xs">{dept.description || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => editDepartment(dept)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        data-testid={`edit-dept-${dept.id}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteDepartment(dept.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                        data-testid={`delete-dept-${dept.id}`}
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

        {filteredDepartments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No departments found. Create your first department to get started.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" data-testid="department-modal">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {editingDept ? 'Edit Department' : 'Add Department'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Revenue Collection"
                  data-testid="dept-name-input"
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
                  placeholder="e.g., REV"
                  data-testid="dept-code-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Head of Department (HOD)</label>
                <select
                  value={formData.head_user_id}
                  onChange={(e) => setFormData({ ...formData, head_user_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="dept-hod-select"
                >
                  <option value="">Select HOD (optional)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} - {u.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief description of department responsibilities"
                  data-testid="dept-desc-input"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingDept(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 font-semibold"
                  data-testid="dept-submit-btn"
                >
                  {submitting ? 'Saving...' : (editingDept ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
