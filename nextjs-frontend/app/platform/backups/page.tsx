'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface BackupStats {
  stats: {
    platform: { total: number; last_backup: string; total_size: number };
    tenants: { total: number; last_backup: string; total_size: number };
    failed_24h: number;
    success_rate: number;
    total_storage_used: string;
  };
  last_platform_backup: { date: string; status: string; size: string } | null;
  recent_backups: BackupRecord[];
  failed_recent: BackupRecord[];
}

interface BackupRecord {
  id: number;
  type: string;
  tenant_slug: string | null;
  filename: string;
  size_human: string;
  status: string;
  trigger_type: string;
  created_at: string;
  duration_seconds: number;
}

interface Tenant {
  id: number;
  name: string;
  slug: string;
  last_backup_at: string | null;
  last_backup_status: string | null;
  last_backup_size: string | null;
}

export default function BackupsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'platform' | 'history'>('overview');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{ slug: string; name: string } | null>(null);
  const [availableBackups, setAvailableBackups] = useState<any[]>([]);
  const [selectedBackupId, setSelectedBackupId] = useState<number | null>(null);
  const [confirmSlug, setConfirmSlug] = useState('');
  const [restoreInProgress, setRestoreInProgress] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        apiClient.get('/platform/backups/stats'),
        apiClient.get('/platform/tenants'),
      ]);
      setStats(statsRes.data);
      setTenants(tenantsRes.data.data || tenantsRes.data);
    } catch (error) {
      console.error('Failed to fetch backup data', error);
    } finally {
      setLoading(false);
    }
  };

  const backupPlatform = async () => {
    setProcessing('platform');
    try {
      await apiClient.post('/platform/backups/platform');
      toast.success('Platform backup completed successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Backup failed');
    } finally {
      setProcessing(null);
    }
  };

  const backupTenant = async (slug: string) => {
    setProcessing(slug);
    try {
      await apiClient.post(`/platform/backups/tenant/${slug}`);
      toast.success('Tenant backup completed successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Backup failed');
    } finally {
      setProcessing(null);
    }
  };

  const openRestoreModal = async (tenant: Tenant) => {
    setRestoreTarget({ slug: tenant.slug, name: tenant.name });
    try {
      const res = await apiClient.get(`/platform/backups/tenant/${tenant.slug}/available`);
      setAvailableBackups(res.data.backups);
      setShowRestoreModal(true);
    } catch (error) {
      toast.error('Failed to load available backups');
    }
  };

  const initiateRestore = async () => {
    if (!selectedBackupId || !restoreTarget) return;

    try {
      const res = await apiClient.post(`/platform/restore/tenant/${restoreTarget.slug}`, {
        backup_id: selectedBackupId,
      });

      const { restore_id, confirmation_token } = res.data;

      // Confirm restore
      if (confirmSlug !== restoreTarget.slug) {
        toast.error('Confirmation slug does not match');
        return;
      }

      setRestoreInProgress(true);

      const confirmRes = await apiClient.post(`/platform/restore/confirm/${restore_id}`, {
        confirmation_token,
        confirmation_slug: confirmSlug,
        queue: false,
      });

      toast.success('Restore completed successfully');
      setShowRestoreModal(false);
      setRestoreTarget(null);
      setSelectedBackupId(null);
      setConfirmSlug('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Restore failed');
    } finally {
      setRestoreInProgress(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/platform/dashboard/enterprise')} className="text-gray-400 hover:text-white">
              ← Back
            </button>
            <h1 className="text-xl font-bold">Backup & Restore</h1>
          </div>
          <button
            onClick={() => apiClient.post('/platform/backups/cleanup').then(() => { toast.success('Cleanup completed'); fetchData(); })}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-medium transition"
          >
            Run Cleanup
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Last Platform Backup</p>
            <p className="text-lg font-semibold">{stats?.last_platform_backup ? formatDate(stats.last_platform_backup.date) : 'Never'}</p>
            {stats?.last_platform_backup && (
              <p className="text-sm text-gray-500 mt-1">{stats.last_platform_backup.size}</p>
            )}
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Total Tenant Backups</p>
            <p className="text-3xl font-bold text-blue-400">{stats?.stats.tenants.total || 0}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Storage Used</p>
            <p className="text-lg font-semibold">{stats?.stats.total_storage_used || '0 bytes'}</p>
          </div>
          <div className={`bg-white/5 backdrop-blur-xl rounded-2xl p-6 border ${(stats?.stats.failed_24h || 0) > 0 ? 'border-red-500/50' : 'border-white/10'}`}>
            <p className="text-gray-400 text-sm mb-1">Failed (24h)</p>
            <p className={`text-3xl font-bold ${(stats?.stats.failed_24h || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {stats?.stats.failed_24h || 0}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['overview', 'tenants', 'platform', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Platform Backup Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Platform Database</h3>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                  {stats?.stats.success_rate || 100}% Success Rate
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Central platform database including tenants registry, platform users, revenue shares, and audit logs.
              </p>
              <button
                onClick={backupPlatform}
                disabled={processing === 'platform'}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition disabled:opacity-50"
              >
                {processing === 'platform' ? 'Backing up...' : 'Backup Platform Now'}
              </button>
            </div>

            {/* Recent Backups */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Recent Backups</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {stats?.recent_backups.slice(0, 5).map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{backup.tenant_slug || 'Platform'}</p>
                      <p className="text-xs text-gray-500">{formatDate(backup.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{backup.size_human}</p>
                      <span className={`text-xs ${backup.status === 'completed' ? 'text-green-400' : 'text-red-400'}`}>
                        {backup.status}
                      </span>
                    </div>
                  </div>
                ))}
                {(!stats?.recent_backups || stats.recent_backups.length === 0) && (
                  <p className="text-gray-500 text-center py-4">No backups yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tenants Tab */}
        {activeTab === 'tenants' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Tenant</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Last Backup</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Size</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-gray-500">{tenant.slug}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {formatDate(tenant.last_backup_at)}
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {tenant.last_backup_size || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tenant.last_backup_status === 'success'
                          ? 'bg-green-500/20 text-green-400'
                          : tenant.last_backup_status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {tenant.last_backup_status || 'Never'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => backupTenant(tenant.slug)}
                        disabled={processing === tenant.slug}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition disabled:opacity-50"
                      >
                        {processing === tenant.slug ? 'Backing up...' : 'Backup'}
                      </button>
                      <button
                        onClick={() => openRestoreModal(tenant)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm transition"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Platform Tab */}
        {activeTab === 'platform' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Platform Database Backups</h3>
                <p className="text-gray-400 text-sm">Manage backups for the central FlexCloud platform</p>
              </div>
              <button
                onClick={backupPlatform}
                disabled={processing === 'platform'}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition disabled:opacity-50"
              >
                {processing === 'platform' ? 'Backing up...' : 'Create Backup'}
              </button>
            </div>

            <div className="space-y-3">
              {stats?.recent_backups
                .filter((b) => b.type === 'platform')
                .map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                      <p className="font-medium">{backup.filename}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(backup.created_at)} • {backup.trigger_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400">{backup.size_human}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        backup.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {backup.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold">Backup History</h3>
            </div>
            <div className="divide-y divide-white/5">
              {stats?.recent_backups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      backup.type === 'platform' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {backup.type === 'platform' ? 'P' : 'T'}
                    </div>
                    <div>
                      <p className="font-medium">{backup.tenant_slug || 'Platform'}</p>
                      <p className="text-sm text-gray-500">{backup.filename}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{formatDate(backup.created_at)}</p>
                      <p className="text-xs text-gray-500">{backup.duration_seconds}s</p>
                    </div>
                    <span className="text-gray-400">{backup.size_human}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      backup.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {backup.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Restore Modal */}
      {showRestoreModal && restoreTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-white/10">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">Restore Tenant Database</h2>
              <p className="text-gray-400 text-sm mt-1">{restoreTarget.name}</p>
            </div>

            {/* Warning Banner */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-400 font-medium">⚠️ DANGER: Irreversible Operation</p>
              <p className="text-red-300 text-sm mt-1">
                This will PERMANENTLY OVERWRITE all current data for this tenant. This action cannot be undone.
              </p>
            </div>

            {/* Backup Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Backup</label>
              <select
                value={selectedBackupId || ''}
                onChange={(e) => setSelectedBackupId(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a backup...</option>
                {availableBackups.map((backup) => (
                  <option key={backup.id} value={backup.id}>
                    {backup.created_at} ({backup.size})
                  </option>
                ))}
              </select>
            </div>

            {/* Confirmation Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type &quot;{restoreTarget.slug}&quot; to confirm
              </label>
              <input
                type="text"
                value={confirmSlug}
                onChange={(e) => setConfirmSlug(e.target.value)}
                placeholder={restoreTarget.slug}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreTarget(null);
                  setSelectedBackupId(null);
                  setConfirmSlug('');
                }}
                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={initiateRestore}
                disabled={!selectedBackupId || confirmSlug !== restoreTarget.slug || restoreInProgress}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restoreInProgress ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
