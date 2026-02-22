'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TenantLayout from '@/components/TenantLayout';
import apiClient from '@/lib/api';

interface AuditLog {
  id: number;
  action: string;
  module: string;
  entity_type: string;
  entity_id: number;
  details: any;
  ip_address: string;
  created_at: string;
  user: { id: number; name: string; email: string; role: string };
}

export default function TenantAuditLogsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'chairman') {
      router.push('/dashboard');
    } else if (user && user.role === 'chairman') {
      fetchLogs();
    }
  }, [user, isLoading, router]);

  const fetchLogs = async () => {
    try {
      const params: any = { per_page: 50 };
      if (moduleFilter !== 'all') params.module = moduleFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await apiClient.get('/audit-logs', { params });
      setLogs(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-700 border-green-200';
      case 'update': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'delete': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Audit Logs</h2>
        <p className="text-gray-600 mt-1">Track all activities within your LGA</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Modules</option>
          <option value="tenant_users">Users</option>
          <option value="roles">Roles</option>
          <option value="businesses">Businesses</option>
          <option value="invoices">Invoices</option>
          <option value="tickets">Tickets</option>
        </select>
        <button
          onClick={fetchLogs}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
        >
          Filter
        </button>
      </div>

      {/* Logs List */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {log.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{log.user?.name || 'System'}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      {log.module && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          {log.module}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {log.entity_type && `${log.entity_type} #${log.entity_id}`}
                      {log.details?.user_name && ` - ${log.details.user_name}`}
                      {log.details?.role_name && ` - ${log.details.role_name}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">{log.ip_address}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No audit logs found.</p>
          </div>
        )}
      </div>
    </TenantLayout>
  );
}
