'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TenantLayout from '@/components/TenantLayout';
import apiClient from '@/lib/api';

interface PaymentSettings {
  id?: number;
  provider: string;
  is_active: boolean;
  api_key: string;
  secret_key: string;
  merchant_id: string;
  webhook_secret: string;
  environment: string;
}

interface SMSSettings {
  id?: number;
  provider: string;
  is_active: boolean;
  api_key: string;
  sender_id: string;
  route: string;
}

interface Template {
  id: number;
  name: string;
  slug: string;
  type: string;
  event: string;
  sms_template: string;
  is_active: boolean;
}

export default function TenantSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('payment');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    provider: 'paymentpoint',
    is_active: false,
    api_key: '',
    secret_key: '',
    merchant_id: '',
    webhook_secret: '',
    environment: 'sandbox',
  });

  const [smsSettings, setSmsSettings] = useState<SMSSettings>({
    provider: 'termii',
    is_active: false,
    api_key: '',
    sender_id: '',
    route: 'transactional',
  });

  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'chairman') {
      router.push('/dashboard');
    } else if (user && user.role === 'chairman') {
      fetchSettings();
    }
  }, [user, isLoading, router]);

  const fetchSettings = async () => {
    try {
      const [paymentRes, smsRes, templatesRes] = await Promise.all([
        apiClient.get('/tenant/settings/payment').catch(() => ({ data: null })),
        apiClient.get('/tenant/settings/sms').catch(() => ({ data: null })),
        apiClient.get('/tenant/templates').catch(() => ({ data: [] })),
      ]);
      
      if (paymentRes.data) setPaymentSettings(paymentRes.data);
      if (smsRes.data) setSmsSettings(smsRes.data);
      setTemplates(templatesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch settings', error);
    } finally {
      setLoading(false);
    }
  };

  const savePaymentSettings = async () => {
    setSaving(true);
    try {
      await apiClient.post('/tenant/settings/payment', paymentSettings);
      alert('Payment settings saved successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveSMSSettings = async () => {
    setSaving(true);
    try {
      await apiClient.post('/tenant/settings/sms', smsSettings);
      alert('SMS settings saved successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      await apiClient.put(`/tenant/templates/${editingTemplate.id}`, {
        sms_template: editingTemplate.sms_template,
        is_active: editingTemplate.is_active,
      });
      setEditingTemplate(null);
      fetchSettings();
      alert('Template saved successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
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
        <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">Configure payment gateways, SMS providers, and notification templates</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-8 max-w-md">
        {['payment', 'sms', 'templates'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition capitalize ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Payment Settings */}
      {activeTab === 'payment' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Gateway Configuration</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">Enable Payment Gateway</p>
                <p className="text-sm text-gray-500">Accept payments via virtual accounts</p>
              </div>
              <button
                onClick={() => setPaymentSettings({ ...paymentSettings, is_active: !paymentSettings.is_active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  paymentSettings.is_active ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  paymentSettings.is_active ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                <select
                  value={paymentSettings.provider}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, provider: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="paymentpoint">PaymentPoint</option>
                  <option value="palmpay">PalmPay</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
                <select
                  value={paymentSettings.environment}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, environment: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input
                  type="password"
                  value={paymentSettings.api_key}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, api_key: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter API Key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                <input
                  type="password"
                  value={paymentSettings.secret_key}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, secret_key: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Secret Key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Merchant ID</label>
                <input
                  type="text"
                  value={paymentSettings.merchant_id}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, merchant_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Merchant ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Secret</label>
                <input
                  type="password"
                  value={paymentSettings.webhook_secret}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, webhook_secret: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Webhook Secret"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Webhook URL:</strong> Configure this URL in your payment provider dashboard to receive payment notifications.
              </p>
              <code className="text-xs bg-blue-100 px-2 py-1 rounded mt-2 inline-block">
                {window.location.origin}/api/webhooks/payment
              </code>
            </div>

            <button
              onClick={savePaymentSettings}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 font-semibold"
            >
              {saving ? 'Saving...' : 'Save Payment Settings'}
            </button>
          </div>
        </div>
      )}

      {/* SMS Settings */}
      {activeTab === 'sms' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">SMS Gateway Configuration</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">Enable SMS Notifications</p>
                <p className="text-sm text-gray-500">Send invoice reminders and payment receipts via SMS</p>
              </div>
              <button
                onClick={() => setSmsSettings({ ...smsSettings, is_active: !smsSettings.is_active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  smsSettings.is_active ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  smsSettings.is_active ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                <select
                  value={smsSettings.provider}
                  onChange={(e) => setSmsSettings({ ...smsSettings, provider: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="termii">Termii</option>
                  <option value="twilio">Twilio</option>
                  <option value="africas_talking">Africa's Talking</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input
                  type="password"
                  value={smsSettings.api_key}
                  onChange={(e) => setSmsSettings({ ...smsSettings, api_key: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter API Key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sender ID</label>
                <input
                  type="text"
                  value={smsSettings.sender_id}
                  onChange={(e) => setSmsSettings({ ...smsSettings, sender_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., FlexCloud"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Route</label>
                <select
                  value={smsSettings.route}
                  onChange={(e) => setSmsSettings({ ...smsSettings, route: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="transactional">Transactional</option>
                  <option value="promotional">Promotional</option>
                </select>
              </div>
            </div>

            <button
              onClick={saveSMSSettings}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 transition disabled:opacity-50 font-semibold"
            >
              {saving ? 'Saving...' : 'Save SMS Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>Available Placeholders:</strong> {'{{tenant_name}}'}, {'{{business_name}}'}, {'{{amount}}'}, {'{{invoice_no}}'}, {'{{ticket_no}}'}, {'{{reference}}'}, {'{{due_date}}'}, {'{{payment_link}}'}
            </p>
          </div>

          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <p className="text-xs text-gray-500">Event: {template.event}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  template.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {editingTemplate?.id === template.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editingTemplate.sms_template}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, sms_template: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingTemplate.is_active}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">Active</span>
                    </label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveTemplate}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-sm text-gray-600 flex-1 mr-4">{template.sms_template}</p>
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}

          {templates.length === 0 && (
            <div className="text-center py-12 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50">
              <p className="text-gray-500">No templates configured. Templates will be created when tenant is provisioned.</p>
            </div>
          )}
        </div>
      )}
    </TenantLayout>
  );
}
