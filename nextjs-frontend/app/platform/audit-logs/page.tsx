'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PlatformLayout from '@/components/PlatformLayout';
import apiClient from '@/lib/api';

interface AuditLog {
  id: number;
  action: string;
  module: string;
  entity_type: string;
  entity_id: number;
  details: any;
  old_values: any;
  new_values: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user: { id: number; name: string; email: string; role: string };
  tenant: { id: number; name: string } | null;
}

interface Stats {
  total_logs: number;
  today_logs: number;
  this_week: number;
  by_action: Record<string, number>;
  by_module: Record<string, number>;
}

export default function PlatformAuditLogsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1 });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'super_admin') {
      router.push('/dashboard');
    } else if (user && user.role === 'super_admin') {
      fetchData();
    }
  }, [user, isLoading, router]);

  const fetchData = async (page = 1) => {
    try {
      const params: any = { page, per_page: 20 };
      if (moduleFilter !== 'all') params.module = moduleFilter;
      if (actionFilter !== 'all') params.action = actionFilter;
      if (searchTerm) params.search = searchTerm;

      const [logsRes, statsRes] = await Promise.all([
        apiClient.get('/platform/audit-logs', { params }),
        apiClient.get('/platform/audit-logs/stats'),
      ]);
      setLogs(logsRes.data.data || logsRes.data);
      setPagination({
        current_page: logsRes.data.current_page || 1,
        last_page: logsRes.data.last_page || 1,
      });
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'update': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'delete': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'suspend': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'activate': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default: return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
  };

  const modules = ['tenants', 'platform_users', 'platform_settings', 'roles', 'tenant_users', 'collector_assignments'];
  const actions = ['create', 'update', 'delete', 'suspend', 'activate', 'bulk_update', 'assign_users', 'assign_roles'];

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
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">Audit Logs</h2>
        <p className="text-purple-300 mt-1">Track all system activities and changes</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
          <p className="text-purple-300 text-xs font-medium">Total Logs</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.total_logs || 0}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
          <p className="text-blue-300 text-xs font-medium">Today</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.today_logs || 0}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
          <p className="text-green-300 text-xs font-medium">This Week</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.this_week || 0}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
          <p className="text-pink-300 text-xs font-medium">Create Actions</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.by_action?.create || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
          />
        </div>
        <select
          value={moduleFilter}
          onChange={(e) => { setModuleFilter(e.target.value); }}
          className="px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
        >
          <option value="all">All Modules</option>
          {modules.map(m => (
            <option key={m} value={m}>{m.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); }}
          className="px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
        >
          <option value="all">All Actions</option>
          {actions.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <button
          onClick={() => fetchData()}
          className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
        >
          Filter
        </button>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            onClick={() => setSelectedLog(log)}
            className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-4 hover:bg-white/15 transition cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                  {log.user?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{log.user?.name || 'System'}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    {log.module && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/10 text-purple-300 border border-purple-500/30">
                        {log.module}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-purple-300 mt-1">
                    {log.entity_type && `${log.entity_type} #${log.entity_id}`}
                    {log.details?.tenant_name && ` - ${log.details.tenant_name}`}
                    {log.details?.user_name && ` - ${log.details.user_name}`}
                  </p>
                  {log.tenant && (
                    <p className="text-xs text-purple-400 mt-1">Tenant: {log.tenant.name}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-purple-300">{new Date(log.created_at).toLocaleString()}</p>
                <p className="text-xs text-purple-400 mt-1">{log.ip_address}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {logs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-purple-300">No audit logs found.</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="flex justify-center space-x-2 mt-6">
          <button
            onClick={() => fetchData(pagination.current_page - 1)}
            disabled={pagination.current_page === 1}
            className="px-4 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-purple-300">
            Page {pagination.current_page} of {pagination.last_page}
          </span>
          <button
            onClick={() => fetchData(pagination.current_page + 1)}
            disabled={pagination.current_page === pagination.last_page}
            className="px-4 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-2xl w-full p-8 border border-purple-500/30 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-white">Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-purple-300 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-purple-300 mb-1">Action</p>
                  <p className="text-white font-medium">{selectedLog.action}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-purple-300 mb-1">Module</p>
                  <p className="text-white font-medium">{selectedLog.module || 'N/A'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-purple-300 mb-1">User</p>
                  <p className="text-white font-medium">{selectedLog.user?.name || 'System'}</p>
                  <p className="text-xs text-purple-400">{selectedLog.user?.email}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-purple-300 mb-1">Timestamp</p>
                  <p className="text-white font-medium">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-purple-300 mb-1">IP Address</p>
                <p className="text-white font-medium">{selectedLog.ip_address}</p>
              </div>

              {selectedLog.details && (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-purple-300 mb-2">Details</p>
                  <pre className="text-sm text-white overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.old_values && (
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                  <p className="text-xs text-red-300 mb-2">Old Values</p>
                  <pre className="text-sm text-white overflow-x-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                  <p className="text-xs text-green-300 mb-2">New Values</p>
                  <pre className="text-sm text-white overflow-x-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}
