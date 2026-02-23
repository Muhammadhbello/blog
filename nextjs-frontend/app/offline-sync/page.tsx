'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TenantLayout from '@/components/TenantLayout';
import apiClient from '@/lib/api';

interface OfflineTicket {
  id: number;
  ticket_number: string;
  amount: number;
  batch_id: number;
}

interface OfflineBatch {
  batch: {
    id: number;
    batch_number: string;
    unit_price: number;
    validity_days: number;
  };
  revenue_point: {
    id: number;
    name: string;
    code: string;
  };
  tickets: OfflineTicket[];
}

interface SyncHistoryItem {
  id: number;
  device_id: string;
  sync_type: string;
  entity_type: string;
  entity_id: number;
  offline_reference: string;
  synced_at: string;
}

interface PendingSync {
  offline_reference: string;
  ticket_id: number;
  ticket_number: string;
  sold_at: string;
  payment_method: string;
  payer_name: string;
  payer_phone: string;
}

export default function OfflineSyncPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'download' | 'sync' | 'history'>('download');
  
  // Download state
  const [offlineData, setOfflineData] = useState<OfflineBatch[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  
  // Sync state
  const [pendingSyncs, setPendingSyncs] = useState<PendingSync[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  
  // History state
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  
  // Device state
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [showRegisterDevice, setShowRegisterDevice] = useState(false);
  const [deviceForm, setDeviceForm] = useState({
    device_name: '',
    device_type: 'android',
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      initializePage();
    }
  }, [user, isLoading, router]);

  const initializePage = async () => {
    // Check for stored device ID
    const storedDeviceId = localStorage.getItem('flexcloud_device_id');
    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    }
    
    // Load pending syncs from local storage
    const storedPending = localStorage.getItem('flexcloud_pending_syncs');
    if (storedPending) {
      setPendingSyncs(JSON.parse(storedPending));
    }
    
    await Promise.all([
      fetchOfflineData(),
      fetchSyncHistory(),
    ]);
    setLoading(false);
  };

  const fetchOfflineData = async () => {
    try {
      const response = await apiClient.get('/offline/tickets', {
        headers: deviceId ? { 'X-Device-ID': deviceId } : {},
      });
      setOfflineData(response.data.data || []);
      setTotalTickets(response.data.total_tickets || 0);
    } catch (error) {
      console.error('Failed to fetch offline data', error);
    }
  };

  const fetchSyncHistory = async () => {
    try {
      const response = await apiClient.get('/offline/sync-history', {
        params: deviceId ? { device_id: deviceId } : {},
      });
      setSyncHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to fetch sync history', error);
    }
  };

  const registerDevice = async () => {
    try {
      const response = await apiClient.post('/offline/register-device', deviceForm);
      const newDeviceId = response.data.device_id;
      localStorage.setItem('flexcloud_device_id', newDeviceId);
      setDeviceId(newDeviceId);
      setShowRegisterDevice(false);
      alert('Device registered successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to register device');
    }
  };

  const downloadForOffline = () => {
    // Save offline data to local storage
    const downloadData = {
      downloaded_at: new Date().toISOString(),
      device_id: deviceId,
      batches: offlineData,
    };
    localStorage.setItem('flexcloud_offline_data', JSON.stringify(downloadData));
    alert(`Downloaded ${totalTickets} tickets for offline use`);
  };

  const simulateOfflineSale = (ticket: OfflineTicket) => {
    const offlineRef = `OFF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPending: PendingSync = {
      offline_reference: offlineRef,
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      sold_at: new Date().toISOString(),
      payment_method: 'cash',
      payer_name: '',
      payer_phone: '',
    };
    
    const updatedPending = [...pendingSyncs, newPending];
    setPendingSyncs(updatedPending);
    localStorage.setItem('flexcloud_pending_syncs', JSON.stringify(updatedPending));
    
    // Remove ticket from offline data
    setOfflineData(prev => prev.map(batch => ({
      ...batch,
      tickets: batch.tickets.filter(t => t.id !== ticket.id),
    })));
    setTotalTickets(prev => prev - 1);
  };

  const syncPendingTickets = async () => {
    if (pendingSyncs.length === 0) {
      alert('No pending syncs');
      return;
    }

    setSyncing(true);
    try {
      const response = await apiClient.post('/offline/sync-tickets', {
        device_id: deviceId || 'unknown',
        tickets: pendingSyncs,
      });
      
      setSyncResults(response.data);
      
      // Clear successfully synced tickets from pending
      const failedRefs = response.data.results.failed.map((f: any) => f.offline_reference);
      const duplicateRefs = response.data.results.duplicates.map((d: any) => d.offline_reference);
      const remainingPending = pendingSyncs.filter(
        p => failedRefs.includes(p.offline_reference) && !duplicateRefs.includes(p.offline_reference)
      );
      
      setPendingSyncs(remainingPending);
      localStorage.setItem('flexcloud_pending_syncs', JSON.stringify(remainingPending));
      
      // Refresh history
      await fetchSyncHistory();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const clearPendingSync = (offlineRef: string) => {
    const updated = pendingSyncs.filter(p => p.offline_reference !== offlineRef);
    setPendingSyncs(updated);
    localStorage.setItem('flexcloud_pending_syncs', JSON.stringify(updated));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Offline POS Sync</h2>
          <p className="text-gray-600 mt-1">Download tickets for offline sales and sync when online</p>
        </div>
        <div className="flex items-center space-x-3">
          {deviceId ? (
            <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-green-700">Device: {deviceId.slice(0, 8)}...</span>
            </div>
          ) : (
            <button
              onClick={() => setShowRegisterDevice(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              data-testid="register-device-btn"
            >
              Register Device
            </button>
          )}
        </div>
      </div>

      {/* Pending Sync Alert */}
      {pendingSyncs.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium text-amber-800">{pendingSyncs.length} ticket(s) pending sync</span>
          </div>
          <button
            onClick={syncPendingTickets}
            disabled={syncing}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
            data-testid="sync-now-btn"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        {(['download', 'sync', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
            }`}
          >
            {tab === 'download' && 'Download Tickets'}
            {tab === 'sync' && `Pending Sync (${pendingSyncs.length})`}
            {tab === 'history' && 'Sync History'}
          </button>
        ))}
      </div>

      {/* Download Tab */}
      {activeTab === 'download' && (
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Available Tickets</h3>
              <button
                onClick={downloadForOffline}
                disabled={totalTickets === 0}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
                data-testid="download-btn"
              >
                Download {totalTickets} Tickets
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Download tickets assigned to you for offline sales. You can sell these tickets without internet and sync later.
            </p>

            <div className="space-y-4">
              {offlineData.map((batch) => (
                <div key={batch.batch.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{batch.revenue_point.name}</p>
                      <p className="text-sm text-gray-500">Batch: {batch.batch.batch_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(batch.batch.unit_price)}</p>
                      <p className="text-sm text-gray-500">{batch.tickets.length} tickets</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2 max-h-40 overflow-y-auto">
                    {batch.tickets.slice(0, 16).map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => simulateOfflineSale(ticket)}
                        className="p-2 text-xs bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded border border-gray-200 hover:border-blue-300 transition"
                        title={`Sell ticket ${ticket.ticket_number}`}
                      >
                        {ticket.ticket_number.slice(-4)}
                      </button>
                    ))}
                    {batch.tickets.length > 16 && (
                      <div className="p-2 text-xs text-gray-400 flex items-center justify-center">
                        +{batch.tickets.length - 16} more
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {offlineData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No ticket batches assigned to you. Contact your supervisor.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync Tab */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {syncResults && (
            <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Sync Results</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{syncResults.summary.success}</p>
                  <p className="text-sm text-green-700">Successful</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{syncResults.summary.failed}</p>
                  <p className="text-sm text-red-700">Failed</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{syncResults.summary.duplicates}</p>
                  <p className="text-sm text-yellow-700">Duplicates</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Pending Syncs ({pendingSyncs.length})</h3>
              {pendingSyncs.length > 0 && (
                <button
                  onClick={syncPendingTickets}
                  disabled={syncing}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50"
                >
                  {syncing ? 'Syncing...' : 'Sync All'}
                </button>
              )}
            </div>

            <div className="space-y-3">
              {pendingSyncs.map((item) => (
                <div key={item.offline_reference} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Ticket: {item.ticket_number}</p>
                    <p className="text-sm text-gray-500">
                      Sold: {formatDate(item.sold_at)} • {item.payment_method}
                    </p>
                  </div>
                  <button
                    onClick={() => clearPendingSync(item.offline_reference)}
                    className="text-red-500 hover:text-red-700"
                    title="Remove from pending"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {pendingSyncs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No pending syncs. All sales have been synchronized.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync History</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Entity</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Reference</th>
                </tr>
              </thead>
              <tbody>
                {syncHistory.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{formatDate(item.synced_at)}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {item.sync_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.entity_type} #{item.entity_id}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 font-mono text-xs">{item.offline_reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {syncHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No sync history yet.
            </div>
          )}
        </div>
      )}

      {/* Register Device Modal */}
      {showRegisterDevice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Register This Device</h3>
            <p className="text-sm text-gray-600 mb-4">
              Register this device to enable offline ticket sales. The device ID will be used to track your offline transactions.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
                <input
                  type="text"
                  value={deviceForm.device_name}
                  onChange={(e) => setDeviceForm({ ...deviceForm, device_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Android Phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
                <select
                  value={deviceForm.device_type}
                  onChange={(e) => setDeviceForm({ ...deviceForm, device_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="android">Android Phone</option>
                  <option value="ios">iPhone/iPad</option>
                  <option value="windows">Windows Device</option>
                  <option value="pos">POS Terminal</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowRegisterDevice(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={registerDevice}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
