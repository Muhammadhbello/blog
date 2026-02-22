'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TenantLayout from '@/components/TenantLayout';
import apiClient from '@/lib/api';

interface Role {
  id: number;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  users_count: number;
}

export default function TenantRolesPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'chairman') {
      router.push('/dashboard');
    } else if (user && user.role === 'chairman') {
      fetchData();
    }
  }, [user, isLoading, router]);

  const fetchData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.get('/tenant/roles'),
        apiClient.get('/tenant/permissions'),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
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
      if (selectedRole) {
        await apiClient.put(`/tenant/roles/${selectedRole.id}`, formData);
      } else {
        await apiClient.post('/tenant/roles', formData);
      }
      setShowModal(false);
      setSelectedRole(null);
      setFormData({ name: '', description: '', permissions: [] });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  const editRole = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setShowModal(true);
  };

  const deleteRole = async (roleId: number) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await apiClient.delete(`/tenant/roles/${roleId}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete role');
    }
  };

  const togglePermission = (perm: string) => {
    if (formData.permissions.includes(perm)) {
      setFormData({ ...formData, permissions: formData.permissions.filter(p => p !== perm) });
    } else {
      setFormData({ ...formData, permissions: [...formData.permissions, perm] });
    }
  };

  const groupPermissions = (perms: string[]) => {
    const groups: Record<string, string[]> = {};
    perms.forEach(p => {
      const [module] = p.split('.');
      if (!groups[module]) groups[module] = [];
      groups[module].push(p);
    });
    return groups;
  };

  const groupedPermissions = groupPermissions(permissions);

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
          <h2 className="text-3xl font-bold text-gray-900">Role Management</h2>
          <p className="text-gray-600 mt-1">Create custom roles with specific permissions</p>
        </div>
        <button
          onClick={() => { setSelectedRole(null); setFormData({ name: '', description: '', permissions: [] }); setShowModal(true); }}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-lg font-semibold flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Role</span>
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">{role.name}</h3>
                  {role.is_system && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                      System
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{role.description || 'No description'}</p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Permissions ({role.permissions?.length || 0})</p>
              <div className="flex flex-wrap gap-1">
                {role.permissions?.slice(0, 5).map(p => (
                  <span key={p} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {p}
                  </span>
                ))}
                {role.permissions?.length > 5 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    +{role.permissions.length - 5} more
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                {role.users_count || 0} users
              </span>
              <div className="flex space-x-2">
                {!role.is_system && (
                  <>
                    <button
                      onClick={() => editRole(role)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteRole(role.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                    >
                      Delete
                    </button>
                  </>
                )}
                {role.is_system && (
                  <span className="text-xs text-gray-400">Cannot edit</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="text-center py-12 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50">
          <p className="text-gray-500">No custom roles yet. System roles will be created automatically.</p>
        </div>
      )}

      {/* Create/Edit Role Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {selectedRole ? 'Edit Role' : 'Create New Role'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Department Manager"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Manages department resources"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Permissions ({formData.permissions.length} selected)
                </label>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-4 space-y-4">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div key={module} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-gray-900 capitalize mb-2">{module}</p>
                      <div className="flex flex-wrap gap-2">
                        {perms.map(perm => (
                          <button
                            key={perm}
                            type="button"
                            onClick={() => togglePermission(perm)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                              formData.permissions.includes(perm)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {perm.split('.')[1]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setSelectedRole(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 font-semibold"
                >
                  {submitting ? 'Saving...' : (selectedRole ? 'Update Role' : 'Create Role')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
