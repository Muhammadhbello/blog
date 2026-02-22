'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PlatformLayout from '@/components/PlatformLayout';
import apiClient from '@/lib/api';

interface Setting {
  id: number;
  key: string;
  value: string;
  type: string;
  group: string;
  description: string;
}

export default function PlatformSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [settings, setSettings] = useState<Record<string, Setting[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSetting, setNewSetting] = useState({
    key: '',
    value: '',
    type: 'string',
    group: 'general',
    description: '',
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'super_admin') {
      router.push('/dashboard');
    } else if (user && user.role === 'super_admin') {
      fetchSettings();
    }
  }, [user, isLoading, router]);

  const fetchSettings = async () => {
    try {
      const response = await apiClient.get('/platform/settings');
      setSettings(response.data);
      
      // Initialize edited values
      const initial: Record<string, string> = {};
      Object.values(response.data).flat().forEach((s: any) => {
        initial[s.key] = s.value;
      });
      setEditedValues(initial);
    } catch (error) {
      console.error('Failed to fetch settings', error);
    } finally {
      setLoading(false);
    }
  };

  const initDefaults = async () => {
    try {
      await apiClient.post('/platform/settings/init-defaults');
      fetchSettings();
    } catch (error) {
      alert('Failed to initialize defaults');
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsToUpdate = Object.entries(editedValues).map(([key, value]) => ({
        key,
        value,
      }));
      await apiClient.post('/platform/settings/bulk', { settings: settingsToUpdate });
      fetchSettings();
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/platform/settings', newSetting);
      setShowAddModal(false);
      setNewSetting({ key: '', value: '', type: 'string', group: 'general', description: '' });
      fetchSettings();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add setting');
    }
  };

  const deleteSetting = async (id: number) => {
    if (!confirm('Are you sure you want to delete this setting?')) return;
    try {
      await apiClient.delete(`/platform/settings/${id}`);
      fetchSettings();
    } catch (error) {
      alert('Failed to delete setting');
    }
  };

  const getGroupIcon = (group: string) => {
    switch (group) {
      case 'general':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        );
      case 'billing':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'features':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'integrations':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
          </svg>
        );
      case 'limits':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
    }
  };

  if (isLoading || loading) {
    return (
      <PlatformLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </PlatformLayout>
    );
  }

  const hasSettings = Object.keys(settings).length > 0;

  return (
    <PlatformLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Platform Settings</h2>
          <p className="text-purple-300 mt-1">Configure global platform settings and integrations</p>
        </div>
        <div className="flex space-x-3">
          {!hasSettings && (
            <button
              onClick={initDefaults}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              Initialize Defaults
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-white/10 border border-purple-500/30 text-white rounded-xl hover:bg-white/20 transition"
          >
            Add Setting
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 font-semibold"
          >
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {!hasSettings ? (
        <div className="text-center py-12 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
          <svg className="w-16 h-16 mx-auto text-purple-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">No Settings Configured</h3>
          <p className="text-purple-300 mb-6">Click "Initialize Defaults" to set up default platform settings.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(settings).map(([group, groupSettings]) => (
            <div key={group} className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-purple-500/20 flex items-center space-x-3">
                <div className="text-purple-400">
                  {getGroupIcon(group)}
                </div>
                <h3 className="text-lg font-semibold text-white capitalize">{group}</h3>
              </div>
              <div className="p-6 space-y-4">
                {groupSettings.map((setting: Setting) => (
                  <div key={setting.id} className="flex items-start justify-between gap-4 p-4 bg-black/20 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-white">{setting.key}</label>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300">
                          {setting.type}
                        </span>
                      </div>
                      {setting.description && (
                        <p className="text-xs text-purple-400 mt-1">{setting.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      {setting.type === 'boolean' ? (
                        <button
                          onClick={() => setEditedValues({
                            ...editedValues,
                            [setting.key]: editedValues[setting.key] === 'true' ? 'false' : 'true'
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            editedValues[setting.key] === 'true' ? 'bg-purple-600' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              editedValues[setting.key] === 'true' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      ) : (
                        <input
                          type={setting.type === 'integer' || setting.type === 'float' ? 'number' : 'text'}
                          value={editedValues[setting.key] || ''}
                          onChange={(e) => setEditedValues({ ...editedValues, [setting.key]: e.target.value })}
                          className="w-48 px-3 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      )}
                      <button
                        onClick={() => deleteSetting(setting.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Setting Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-purple-500/30">
            <h2 className="text-2xl font-bold text-white mb-6">Add New Setting</h2>
            <form onSubmit={addSetting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-1">Key</label>
                <input
                  type="text"
                  required
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                  placeholder="setting_key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-1">Value</label>
                <input
                  type="text"
                  required
                  value={newSetting.value}
                  onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                  placeholder="value"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-1">Type</label>
                  <select
                    value={newSetting.type}
                    onChange={(e) => setNewSetting({ ...newSetting, type: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  >
                    <option value="string">String</option>
                    <option value="boolean">Boolean</option>
                    <option value="integer">Integer</option>
                    <option value="float">Float</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-1">Group</label>
                  <select
                    value={newSetting.group}
                    onChange={(e) => setNewSetting({ ...newSetting, group: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  >
                    <option value="general">General</option>
                    <option value="billing">Billing</option>
                    <option value="features">Features</option>
                    <option value="integrations">Integrations</option>
                    <option value="limits">Limits</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-1">Description</label>
                <input
                  type="text"
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                  placeholder="Optional description"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border border-purple-500/30 rounded-xl hover:bg-white/5 transition text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition"
                >
                  Add Setting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}
