'use client';

import React, { useState, useEffect } from 'react';
import { EnhancedTenantLayout } from '@/components/layout/EnhancedTenantLayout';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  User,
  Clock,
  Activity,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UserCheck,
  X
} from 'lucide-react';
import apiClient from '@/lib/api';

interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  is_impersonation: boolean;
  created_at: string;
}

interface AuditStats {
  action_counts: Record<string, number>;
  module_counts: { module: string; count: number }[];
  active_users: { user_id: number; user_name: string; user_email: string; activity_count: number }[];
  impersonation_count: number;
  total_logs: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    module: '',
    date_from: '',
    date_to: '',
  });
  const [modules, setModules] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, filters]);

  const fetchFilters = async () => {
    try {
      const [modulesRes, actionsRes] = await Promise.all([
        apiClient.get('/api/tenant/audit-logs/modules'),
        apiClient.get('/api/tenant/audit-logs/actions'),
      ]);
      setModules(modulesRes.data);
      setActions(actionsRes.data);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '25',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      });
      const response = await apiClient.get(`/api/tenant/audit-logs?${params}`);
      setLogs(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/api/tenant/audit-logs/stats?range=week');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      );
      window.open(`/api/tenant/audit-logs/export?${params}`, '_blank');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'update':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'access':
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-700';
      case 'update':
        return 'bg-blue-100 text-blue-700';
      case 'delete':
        return 'bg-red-100 text-red-700';
      case 'access':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <EnhancedTenantLayout title="Audit Logs" subtitle="Track all system activities and changes">
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats?.total_logs ?? 0}</div>
                <div className="text-sm text-gray-500">Total Events</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Plus className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats?.action_counts?.create ?? 0}</div>
                <div className="text-sm text-gray-500">Created</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Edit className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats?.action_counts?.update ?? 0}</div>
                <div className="text-sm text-gray-500">Updated</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats?.impersonation_count ?? 0}</div>
                <div className="text-sm text-gray-500">Impersonations</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user, entity, or description..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={() => fetchLogs()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">All Actions</option>
                  {actions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                <select
                  value={filters.module}
                  onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">All Modules</option>
                  {modules.map(module => (
                    <option key={module} value={module}>{module}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(log.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {log.user_name || 'System'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.user_role || '—'}
                          </div>
                        </div>
                        {log.is_impersonation && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            Impersonated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700 capitalize">{log.module}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.entity_type}</div>
                        {log.entity_id && (
                          <div className="text-xs text-gray-500">ID: {log.entity_id}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500 font-mono">{log.ip_address || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Eye className="h-4 w-4 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No audit logs found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Audit Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">User</label>
                    <p className="text-sm text-gray-900">{selectedLog.user_name || 'System'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{selectedLog.user_email || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Action</label>
                    <p className="text-sm text-gray-900">{selectedLog.action}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Module</label>
                    <p className="text-sm text-gray-900">{selectedLog.module}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Entity Type</label>
                    <p className="text-sm text-gray-900">{selectedLog.entity_type}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Entity ID</label>
                    <p className="text-sm text-gray-900">{selectedLog.entity_id || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">IP Address</label>
                    <p className="text-sm font-mono text-gray-900">{selectedLog.ip_address || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Timestamp</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedLog.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedLog.details && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-2">Details</label>
                    <pre className="p-3 bg-gray-50 rounded-lg text-xs text-gray-700 overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.old_values && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-2">Old Values</label>
                    <pre className="p-3 bg-red-50 rounded-lg text-xs text-red-700 overflow-x-auto">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_values && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-2">New Values</label>
                    <pre className="p-3 bg-green-50 rounded-lg text-xs text-green-700 overflow-x-auto">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </EnhancedTenantLayout>
  );
}
