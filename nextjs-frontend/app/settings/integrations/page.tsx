'use client';

import React, { useState, useEffect } from 'react';
import { EnhancedTenantLayout } from '@/components/layout/EnhancedTenantLayout';
import { 
  CreditCard, 
  MessageSquare, 
  Settings, 
  Check, 
  X, 
  Eye, 
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Smartphone,
  Zap,
  Shield,
  TestTube
} from 'lucide-react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface PaymentProvider {
  id: string | null;
  provider: string;
  mode: 'test' | 'live';
  merchant_id: string;
  public_key: string;
  secret_key_masked: string | null;
  base_url: string;
  webhook_secret_masked: string | null;
  is_enabled: boolean;
  last_tested_at: string | null;
  last_test_status: 'success' | 'failed' | null;
  last_test_message: string | null;
  has_secret_key: boolean;
  has_webhook_secret: boolean;
}

interface SmsProvider {
  id: string | null;
  provider: string;
  mode: 'test' | 'live';
  api_key_masked: string | null;
  sender_id: string;
  route: string;
  additional_config: Record<string, unknown>;
  is_enabled: boolean;
  last_tested_at: string | null;
  last_test_status: 'success' | 'failed' | null;
  last_test_message: string | null;
  has_api_key: boolean;
}

interface TestStep {
  step: string;
  status: 'pending' | 'success' | 'failed';
  message?: string;
}

export default function TenantSettingsPage() {
  const [activeTab, setActiveTab] = useState<'payment' | 'sms' | 'templates'>('payment');
  const [paymentProviders, setPaymentProviders] = useState<Record<string, PaymentProvider>>({});
  const [smsProviders, setSmsProviders] = useState<Record<string, SmsProvider>>({});
  const [activePaymentProvider, setActivePaymentProvider] = useState<string | null>(null);
  const [activeSmsProvider, setActiveSmsProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [showTestModal, setShowTestModal] = useState(false);

  // Form states for editing
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editingSms, setEditingSms] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Form values
  const [paymentForm, setPaymentForm] = useState({
    mode: 'test' as const,
    merchant_id: '',
    public_key: '',
    secret_key: '',
    base_url: '',
    webhook_secret: '',
    is_enabled: false,
  });

  const [smsForm, setSmsForm] = useState({
    mode: 'test' as const,
    api_key: '',
    sender_id: '',
    route: 'generic',
    is_enabled: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [paymentRes, smsRes] = await Promise.all([
        apiClient.get('/api/tenant/settings/payment'),
        apiClient.get('/api/tenant/settings/sms'),
      ]);

      setPaymentProviders(paymentRes.data.providers);
      setActivePaymentProvider(paymentRes.data.active_provider);
      setSmsProviders(smsRes.data.providers);
      setActiveSmsProvider(smsRes.data.active_provider);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const savePaymentSettings = async (provider: string) => {
    setSaving(true);
    try {
      await apiClient.post('/api/tenant/settings/payment', {
        provider,
        ...paymentForm,
      });
      toast.success(`${provider === 'paymentpoint' ? 'PaymentPoint' : 'PalmPay'} settings saved`);
      fetchSettings();
      setEditingPayment(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveSmsSettings = async (provider: string) => {
    setSaving(true);
    try {
      await apiClient.post('/api/tenant/settings/sms', {
        provider,
        ...smsForm,
      });
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} settings saved`);
      fetchSettings();
      setEditingSms(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (type: 'payment' | 'sms', provider: string) => {
    setTestingProvider(provider);
    setShowTestModal(true);
    setTestSteps([
      { step: 'Validating Format', status: 'pending' },
      { step: 'Connecting to API', status: 'pending' },
      { step: 'Verifying Credentials', status: 'pending' },
    ]);

    try {
      const endpoint = type === 'payment' 
        ? '/api/tenant/settings/payment/test'
        : '/api/tenant/settings/sms/test';
      
      const response = await apiClient.post(endpoint, { provider });
      
      setTestSteps(response.data.steps.map((s: TestStep) => ({
        step: s.step,
        status: s.status,
        message: s.message,
      })));

      if (response.data.success) {
        toast.success('Connection test successful!');
      }
    } catch (error: any) {
      const errorSteps = error.response?.data?.steps || [
        { step: 'Connection Test', status: 'failed', message: 'Connection failed' }
      ];
      setTestSteps(errorSteps);
      toast.error(error.response?.data?.message || 'Connection test failed');
    } finally {
      setTestingProvider(null);
    }
  };

  const startEditingPayment = (provider: string) => {
    const p = paymentProviders[provider];
    setPaymentForm({
      mode: p?.mode || 'test',
      merchant_id: p?.merchant_id || '',
      public_key: p?.public_key || '',
      secret_key: '',
      base_url: p?.base_url || '',
      webhook_secret: '',
      is_enabled: p?.is_enabled || false,
    });
    setEditingPayment(provider);
  };

  const startEditingSms = (provider: string) => {
    const p = smsProviders[provider];
    setSmsForm({
      mode: p?.mode || 'test',
      api_key: '',
      sender_id: p?.sender_id || '',
      route: p?.route || 'generic',
      is_enabled: p?.is_enabled || false,
    });
    setEditingSms(provider);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <EnhancedTenantLayout title="Settings" subtitle="Configure payment and SMS gateways">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </EnhancedTenantLayout>
    );
  }

  return (
    <EnhancedTenantLayout title="Settings" subtitle="Configure payment and SMS gateways">
      <div className="p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
          {[
            { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
            { id: 'sms', label: 'SMS Gateway', icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Payment Gateway Tab */}
        {activeTab === 'payment' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PaymentPoint */}
            <PaymentProviderCard
              provider="paymentpoint"
              title="PaymentPoint"
              description="Nigerian payment gateway with virtual accounts"
              data={paymentProviders.paymentpoint}
              isActive={activePaymentProvider === 'paymentpoint'}
              isEditing={editingPayment === 'paymentpoint'}
              form={paymentForm}
              setForm={setPaymentForm}
              showSecrets={showSecrets}
              toggleSecret={toggleSecret}
              onEdit={() => startEditingPayment('paymentpoint')}
              onCancel={() => setEditingPayment(null)}
              onSave={() => savePaymentSettings('paymentpoint')}
              onTest={() => testConnection('payment', 'paymentpoint')}
              saving={saving}
              testing={testingProvider === 'paymentpoint'}
            />

            {/* PalmPay */}
            <PaymentProviderCard
              provider="palmpay"
              title="PalmPay"
              description="Mobile money and bank transfer gateway"
              data={paymentProviders.palmpay}
              isActive={activePaymentProvider === 'palmpay'}
              isEditing={editingPayment === 'palmpay'}
              form={paymentForm}
              setForm={setPaymentForm}
              showSecrets={showSecrets}
              toggleSecret={toggleSecret}
              onEdit={() => startEditingPayment('palmpay')}
              onCancel={() => setEditingPayment(null)}
              onSave={() => savePaymentSettings('palmpay')}
              onTest={() => testConnection('payment', 'palmpay')}
              saving={saving}
              testing={testingProvider === 'palmpay'}
            />
          </div>
        )}

        {/* SMS Gateway Tab */}
        {activeTab === 'sms' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Termii */}
            <SmsProviderCard
              provider="termii"
              title="Termii"
              description="Nigerian SMS gateway"
              data={smsProviders.termii}
              isActive={activeSmsProvider === 'termii'}
              isEditing={editingSms === 'termii'}
              form={smsForm}
              setForm={setSmsForm}
              showSecrets={showSecrets}
              toggleSecret={toggleSecret}
              onEdit={() => startEditingSms('termii')}
              onCancel={() => setEditingSms(null)}
              onSave={() => saveSmsSettings('termii')}
              onTest={() => testConnection('sms', 'termii')}
              saving={saving}
              testing={testingProvider === 'termii'}
            />

            {/* Twilio */}
            <SmsProviderCard
              provider="twilio"
              title="Twilio"
              description="Global SMS platform"
              data={smsProviders.twilio}
              isActive={activeSmsProvider === 'twilio'}
              isEditing={editingSms === 'twilio'}
              form={smsForm}
              setForm={setSmsForm}
              showSecrets={showSecrets}
              toggleSecret={toggleSecret}
              onEdit={() => startEditingSms('twilio')}
              onCancel={() => setEditingSms(null)}
              onSave={() => saveSmsSettings('twilio')}
              onTest={() => testConnection('sms', 'twilio')}
              saving={saving}
              testing={testingProvider === 'twilio'}
            />

            {/* Africa's Talking */}
            <SmsProviderCard
              provider="africas_talking"
              title="Africa's Talking"
              description="African SMS gateway"
              data={smsProviders.africas_talking}
              isActive={activeSmsProvider === 'africas_talking'}
              isEditing={editingSms === 'africas_talking'}
              form={smsForm}
              setForm={setSmsForm}
              showSecrets={showSecrets}
              toggleSecret={toggleSecret}
              onEdit={() => startEditingSms('africas_talking')}
              onCancel={() => setEditingSms(null)}
              onSave={() => saveSmsSettings('africas_talking')}
              onTest={() => testConnection('sms', 'africas_talking')}
              saving={saving}
              testing={testingProvider === 'africas_talking'}
            />
          </div>
        )}

        {/* Test Connection Modal */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Connection Test</h3>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {testSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1 rounded-full ${
                      step.status === 'success' ? 'bg-green-100' :
                      step.status === 'failed' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      {step.status === 'pending' && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                      {step.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {step.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${
                        step.status === 'success' ? 'text-green-700' :
                        step.status === 'failed' ? 'text-red-700' :
                        'text-gray-600'
                      }`}>
                        {step.step}
                      </div>
                      {step.message && (
                        <div className="text-sm text-gray-500 mt-0.5">{step.message}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowTestModal(false)}
                className="mt-6 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </EnhancedTenantLayout>
  );
}

// Payment Provider Card Component
function PaymentProviderCard({
  provider,
  title,
  description,
  data,
  isActive,
  isEditing,
  form,
  setForm,
  showSecrets,
  toggleSecret,
  onEdit,
  onCancel,
  onSave,
  onTest,
  saving,
  testing,
}: {
  provider: string;
  title: string;
  description: string;
  data: PaymentProvider;
  isActive: boolean;
  isEditing: boolean;
  form: any;
  setForm: (f: any) => void;
  showSecrets: Record<string, boolean>;
  toggleSecret: (key: string) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onTest: () => void;
  saving: boolean;
  testing: boolean;
}) {
  const gradients: Record<string, string> = {
    paymentpoint: 'from-blue-500 to-indigo-600',
    palmpay: 'from-green-500 to-emerald-600',
  };

  return (
    <div className={`bg-white/80 backdrop-blur-md border rounded-2xl overflow-hidden transition-all ${
      isActive ? 'border-blue-300 shadow-lg shadow-blue-100' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${gradients[provider]} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-white/80">{description}</p>
            </div>
          </div>
          {isActive && (
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium flex items-center gap-1">
              <Check className="h-3 w-3" /> Active
            </span>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${
            data?.last_test_status === 'success' ? 'bg-green-500' :
            data?.last_test_status === 'failed' ? 'bg-red-500' :
            'bg-gray-300'
          }`}></div>
          <span className="text-sm text-gray-600">
            {data?.last_test_status === 'success' ? 'Connected' :
             data?.last_test_status === 'failed' ? 'Connection Failed' :
             'Not Tested'}
          </span>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          data?.mode === 'live' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {data?.mode === 'live' ? 'LIVE' : 'TEST'}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
              <div className="flex gap-2">
                {['test', 'live'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setForm({ ...form, mode })}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      form.mode === mode
                        ? mode === 'live' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-amber-100 text-amber-700 ring-2 ring-amber-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {mode === 'live' ? 'Live' : 'Test'}
                  </button>
                ))}
              </div>
            </div>

            {/* Merchant ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID</label>
              <input
                type="text"
                value={form.merchant_id}
                onChange={(e) => setForm({ ...form, merchant_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Enter merchant ID"
              />
            </div>

            {/* Public Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
              <input
                type="text"
                value={form.public_key}
                onChange={(e) => setForm({ ...form, public_key: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="pk_test_..."
              />
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
              <div className="relative">
                <input
                  type={showSecrets['secret'] ? 'text' : 'password'}
                  value={form.secret_key}
                  onChange={(e) => setForm({ ...form, secret_key: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder={data?.has_secret_key ? '••••••••' : 'sk_test_...'}
                />
                <button
                  type="button"
                  onClick={() => toggleSecret('secret')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets['secret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {data?.has_secret_key && (
                <p className="text-xs text-gray-500 mt-1">Leave blank to keep existing key</p>
              )}
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-700">Enable this provider</span>
              <button
                onClick={() => setForm({ ...form, is_enabled: !form.is_enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  form.is_enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  form.is_enabled ? 'translate-x-7' : 'translate-x-1'
                }`}></div>
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Merchant ID</span>
              <span className="text-sm font-medium text-gray-900">{data?.merchant_id || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Secret Key</span>
              <span className="text-sm font-mono text-gray-900">{data?.secret_key_masked || '—'}</span>
            </div>
            {data?.last_tested_at && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Last Tested</span>
                <span className="text-sm text-gray-600">
                  {new Date(data.last_tested_at).toLocaleString()}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={onEdit}
                className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Configure
              </button>
              <button
                onClick={onTest}
                disabled={testing || !data?.has_secret_key}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                Test
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// SMS Provider Card Component (similar structure)
function SmsProviderCard({
  provider,
  title,
  description,
  data,
  isActive,
  isEditing,
  form,
  setForm,
  showSecrets,
  toggleSecret,
  onEdit,
  onCancel,
  onSave,
  onTest,
  saving,
  testing,
}: {
  provider: string;
  title: string;
  description: string;
  data: SmsProvider;
  isActive: boolean;
  isEditing: boolean;
  form: any;
  setForm: (f: any) => void;
  showSecrets: Record<string, boolean>;
  toggleSecret: (key: string) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onTest: () => void;
  saving: boolean;
  testing: boolean;
}) {
  const gradients: Record<string, string> = {
    termii: 'from-purple-500 to-violet-600',
    twilio: 'from-red-500 to-rose-600',
    africas_talking: 'from-orange-500 to-amber-600',
  };

  return (
    <div className={`bg-white/80 backdrop-blur-md border rounded-2xl overflow-hidden transition-all ${
      isActive ? 'border-purple-300 shadow-lg shadow-purple-100' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${gradients[provider]} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-white/80">{description}</p>
            </div>
          </div>
          {isActive && (
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium flex items-center gap-1">
              <Check className="h-3 w-3" /> Active
            </span>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${
            data?.last_test_status === 'success' ? 'bg-green-500' :
            data?.last_test_status === 'failed' ? 'bg-red-500' :
            'bg-gray-300'
          }`}></div>
          <span className="text-sm text-gray-600">
            {data?.last_test_status === 'success' ? 'Connected' :
             data?.last_test_status === 'failed' ? 'Connection Failed' :
             'Not Tested'}
          </span>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          data?.mode === 'live' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {data?.mode === 'live' ? 'LIVE' : 'TEST'}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
              <div className="flex gap-2">
                {['test', 'live'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setForm({ ...form, mode })}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      form.mode === mode
                        ? mode === 'live' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-amber-100 text-amber-700 ring-2 ring-amber-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {mode === 'live' ? 'Live' : 'Test'}
                  </button>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <div className="relative">
                <input
                  type={showSecrets['api'] ? 'text' : 'password'}
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder={data?.has_api_key ? '••••••••' : 'Enter API key'}
                />
                <button
                  type="button"
                  onClick={() => toggleSecret('api')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets['api'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sender ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID</label>
              <input
                type="text"
                value={form.sender_id}
                onChange={(e) => setForm({ ...form, sender_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                placeholder="FlexCloud"
                maxLength={11}
              />
              <p className="text-xs text-gray-500 mt-1">Max 11 characters</p>
            </div>

            {/* Route (for Termii) */}
            {provider === 'termii' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                <select
                  value={form.route}
                  onChange={(e) => setForm({ ...form, route: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="generic">Generic</option>
                  <option value="dnd">DND (Do Not Disturb)</option>
                </select>
              </div>
            )}

            {/* Enable Toggle */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-700">Enable this provider</span>
              <button
                onClick={() => setForm({ ...form, is_enabled: !form.is_enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  form.is_enabled ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  form.is_enabled ? 'translate-x-7' : 'translate-x-1'
                }`}></div>
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Sender ID</span>
              <span className="text-sm font-medium text-gray-900">{data?.sender_id || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">API Key</span>
              <span className="text-sm font-mono text-gray-900">{data?.api_key_masked || '—'}</span>
            </div>
            {data?.last_tested_at && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Last Tested</span>
                <span className="text-sm text-gray-600">
                  {new Date(data.last_tested_at).toLocaleString()}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={onEdit}
                className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Configure
              </button>
              <button
                onClick={onTest}
                disabled={testing || !data?.has_api_key}
                className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                Test
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
