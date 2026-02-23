'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TenantLayout from '@/components/TenantLayout';
import apiClient from '@/lib/api';

interface EmailSettings {
  provider: string;
  from_email: string;
  from_name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_encryption: string;
  api_key?: string;
  is_active: boolean;
}

interface EmailTemplate {
  id: number;
  type: string;
  name: string;
  email_subject: string;
  email_template: string;
  is_active: boolean;
}

interface EmailLog {
  id: number;
  recipient: string;
  subject: string;
  status: string;
  error?: string;
  sent_at?: string;
  created_at: string;
}

interface EmailStats {
  totals: {
    total_sent: number;
    total_failed: number;
    sent_today: number;
  };
  daily: Array<{
    date: string;
    status: string;
    count: number;
  }>;
}

export default function EmailNotificationsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'templates' | 'logs' | 'send'>('settings');
  
  // Settings state
  const [settings, setSettings] = useState<EmailSettings>({
    provider: 'smtp',
    from_email: '',
    from_name: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_encryption: 'tls',
    is_active: false,
  });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  
  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  
  // Logs state
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  
  // Bulk send state
  const [bulkForm, setBulkForm] = useState({
    subject: '',
    message: '',
    business_ids: [] as number[],
  });
  const [businesses, setBusinesses] = useState<Array<{ id: number; business_name: string; owner_email: string }>>([]);
  const [sendingBulk, setSendingBulk] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchData();
    }
  }, [user, isLoading, router]);

  const fetchData = async () => {
    try {
      const [settingsRes, templatesRes, logsRes, statsRes, businessesRes] = await Promise.all([
        apiClient.get('/notifications/email/settings'),
        apiClient.get('/notifications/email/templates'),
        apiClient.get('/notifications/email/logs'),
        apiClient.get('/notifications/email/stats'),
        apiClient.get('/businesses'),
      ]);
      
      setSettings(settingsRes.data);
      setTemplates(templatesRes.data || []);
      setLogs(logsRes.data.data || logsRes.data || []);
      setStats(statsRes.data);
      setBusinesses(businessesRes.data.data || businessesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch email data', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = { ...settings };
      if (newPassword) {
        (payload as any).smtp_password = newPassword;
      }
      
      await apiClient.post('/notifications/email/settings', payload);
      alert('Email settings saved successfully!');
      setNewPassword('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }
    
    setTesting(true);
    try {
      const response = await apiClient.post('/notifications/email/test', {
        test_email: testEmail,
      });
      
      if (response.data.success) {
        alert('Test email sent successfully! Check your inbox.');
      } else {
        alert('Failed to send test email: ' + response.data.message);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    
    try {
      await apiClient.put(`/notifications/email/templates/${editingTemplate.id}`, {
        email_subject: editingTemplate.email_subject,
        email_template: editingTemplate.email_template,
        is_active: editingTemplate.is_active,
      });
      
      setTemplates(templates.map(t => 
        t.id === editingTemplate.id ? editingTemplate : t
      ));
      setEditingTemplate(null);
      alert('Template saved successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save template');
    }
  };

  const sendBulkEmail = async () => {
    if (!bulkForm.subject || !bulkForm.message || bulkForm.business_ids.length === 0) {
      alert('Please fill all fields and select at least one business');
      return;
    }
    
    setSendingBulk(true);
    try {
      const response = await apiClient.post('/notifications/email/bulk', bulkForm);
      alert(`Bulk email sent!\nSuccess: ${response.data.results.success}\nFailed: ${response.data.results.failed}\nSkipped: ${response.data.results.skipped}`);
      setBulkForm({ subject: '', message: '', business_ids: [] });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send bulk email');
    } finally {
      setSendingBulk(false);
    }
  };

  const toggleBusinessSelection = (id: number) => {
    if (bulkForm.business_ids.includes(id)) {
      setBulkForm({
        ...bulkForm,
        business_ids: bulkForm.business_ids.filter(bid => bid !== id),
      });
    } else {
      setBulkForm({
        ...bulkForm,
        business_ids: [...bulkForm.business_ids, id],
      });
    }
  };

  const selectAllBusinesses = () => {
    const emailBusinesses = businesses.filter(b => b.owner_email);
    setBulkForm({
      ...bulkForm,
      business_ids: emailBusinesses.map(b => b.id),
    });
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
          <h2 className="text-3xl font-bold text-gray-900">Email Notifications</h2>
          <p className="text-gray-600 mt-1">Configure email settings and send notifications to businesses</p>
        </div>
        {stats && (
          <div className="flex items-center space-x-4">
            <div className="text-center px-4 py-2 bg-green-50 rounded-lg border border-green-200">
              <p className="text-lg font-bold text-green-600">{stats.totals.sent_today}</p>
              <p className="text-xs text-green-700">Sent Today</p>
            </div>
            <div className="text-center px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-lg font-bold text-blue-600">{stats.totals.total_sent}</p>
              <p className="text-xs text-blue-700">Total Sent</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {(['settings', 'templates', 'logs', 'send'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
            }`}
          >
            {tab === 'send' ? 'Send Bulk' : tab}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select
                  value={settings.provider}
                  onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="smtp">SMTP</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailgun">Mailgun</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                  <input
                    type="email"
                    value={settings.from_email}
                    onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="noreply@lga.gov.ng"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                  <input
                    type="text"
                    value={settings.from_name}
                    onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Potiskum LGA Revenue"
                  />
                </div>
              </div>

              {settings.provider === 'smtp' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                      <input
                        type="text"
                        value={settings.smtp_host}
                        onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                      <input
                        type="number"
                        value={settings.smtp_port}
                        onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
                    <input
                      type="text"
                      value={settings.smtp_username}
                      onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Leave blank to keep existing"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Encryption</label>
                    <select
                      value={settings.smtp_encryption}
                      onChange={(e) => setSettings({ ...settings, smtp_encryption: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="tls">TLS</option>
                      <option value="ssl">SSL</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </>
              )}

              {(settings.provider === 'sendgrid' || settings.provider === 'mailgun') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={settings.api_key || ''}
                    onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter API key"
                  />
                </div>
              )}

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={settings.is_active}
                  onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">Enable email notifications</label>
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Email</h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Send a test email to verify your configuration is working correctly.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Email Address</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>
              
              <button
                onClick={sendTestEmail}
                disabled={testing || !settings.is_active}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {testing ? 'Sending...' : 'Send Test Email'}
              </button>
              
              {!settings.is_active && (
                <p className="text-sm text-amber-600">Enable email notifications to send test emails.</p>
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Quick Setup Guide</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• For Gmail: Use smtp.gmail.com, port 587, TLS</li>
                <li>• Enable "Less secure app access" or use App Password</li>
                <li>• For SendGrid: Get API key from sendgrid.com</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Templates</h3>
          
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{template.name || template.type}</p>
                    <p className="text-sm text-gray-500">Type: {template.type}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                {template.email_subject && (
                  <p className="text-sm text-gray-600">Subject: {template.email_subject}</p>
                )}
              </div>
            ))}

            {templates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No email templates configured yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Logs</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Recipient</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Subject</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{formatDate(log.created_at)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{log.recipient}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{log.subject}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No email logs yet.
            </div>
          )}
        </div>
      )}

      {/* Send Bulk Tab */}
      {activeTab === 'send' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compose Email</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={bulkForm.subject}
                  onChange={(e) => setBulkForm({ ...bulkForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Important notice regarding your account"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={bulkForm.message}
                  onChange={(e) => setBulkForm({ ...bulkForm, message: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dear {{owner_name}},&#10;&#10;Your message here...&#10;&#10;Available placeholders: {{business_name}}, {{owner_name}}"
                />
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Available placeholders:</strong> {"{{business_name}}"}, {"{{owner_name}}"}
                </p>
              </div>
              
              <button
                onClick={sendBulkEmail}
                disabled={sendingBulk || !settings.is_active || bulkForm.business_ids.length === 0}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 font-semibold"
              >
                {sendingBulk ? 'Sending...' : `Send to ${bulkForm.business_ids.length} Businesses`}
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Recipients</h3>
              <button
                onClick={selectAllBusinesses}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Select All
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {businesses.filter(b => b.owner_email).map((business) => (
                <div
                  key={business.id}
                  onClick={() => toggleBusinessSelection(business.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                    bulkForm.business_ids.includes(business.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={bulkForm.business_ids.includes(business.id)}
                      onChange={() => {}}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{business.business_name}</p>
                      <p className="text-xs text-gray-500">{business.owner_email}</p>
                    </div>
                  </div>
                </div>
              ))}

              {businesses.filter(b => b.owner_email).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No businesses with email addresses found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Edit Template: {editingTemplate.name || editingTemplate.type}</h3>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                  <input
                    type="text"
                    value={editingTemplate.email_subject || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, email_subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Template (HTML)</label>
                  <textarea
                    value={editingTemplate.email_template || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, email_template: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="template_active"
                    checked={editingTemplate.is_active}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="template_active" className="text-sm text-gray-700">Template Active</label>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => setEditingTemplate(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
