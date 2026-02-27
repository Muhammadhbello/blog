'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EnhancedTenantLayout } from '@/components/layout/EnhancedTenantLayout';
import { 
  MessageSquare, 
  Mail, 
  Save, 
  Eye, 
  Smartphone, 
  Code, 
  Sparkles,
  ChevronDown,
  Check,
  X,
  RefreshCw,
  Copy,
  AlertCircle,
  Loader2,
  Lightbulb,
  Info
} from 'lucide-react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface Template {
  id: string;
  channel: 'sms' | 'email' | 'payment_notification';
  key: string;
  name: string;
  subject: string | null;
  body: string;
  is_active: boolean;
  placeholders: Record<string, string>;
  updated_at: string;
}

interface PreviewData {
  original: string;
  preview: string;
  sample_data: Record<string, string>;
  character_count: number;
  sms_segments: number;
}

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editedBody, setEditedBody] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedActive, setEditedActive] = useState(true);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
  const [filterChannel, setFilterChannel] = useState<string>('all');

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setEditedBody(selectedTemplate.body);
      setEditedSubject(selectedTemplate.subject || '');
      setEditedActive(selectedTemplate.is_active);
      generatePreview(selectedTemplate.body, selectedTemplate.key);
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const response = await apiClient.get('/api/tenant/templates');
      setTemplates(response.data.templates);
      if (response.data.templates.length > 0) {
        setSelectedTemplate(response.data.templates[0]);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async (body: string, key: string) => {
    try {
      const response = await apiClient.post('/api/tenant/templates/preview', { body, key });
      setPreview(response.data);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    }
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    
    setSaving(true);
    try {
      await apiClient.put(`/api/tenant/templates/${selectedTemplate.id}`, {
        name: selectedTemplate.name,
        subject: selectedTemplate.channel === 'email' ? editedSubject : null,
        body: editedBody,
        is_active: editedActive,
      });
      toast.success('Template saved successfully');
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    setEditedBody(prev => prev + placeholder);
    generatePreview(editedBody + placeholder, selectedTemplate?.key || '');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const filteredTemplates = useMemo(() => {
    if (filterChannel === 'all') return templates;
    return templates.filter(t => t.channel === filterChannel);
  }, [templates, filterChannel]);

  const channelCounts = useMemo(() => {
    return {
      all: templates.length,
      sms: templates.filter(t => t.channel === 'sms').length,
      email: templates.filter(t => t.channel === 'email').length,
    };
  }, [templates]);

  if (loading) {
    return (
      <EnhancedTenantLayout title="Message Templates" subtitle="Customize SMS and email templates">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </EnhancedTenantLayout>
    );
  }

  return (
    <EnhancedTenantLayout title="Message Templates" subtitle="Customize SMS and email notification templates">
      <div className="h-[calc(100vh-180px)] flex">
        {/* Template List - Left Panel */}
        <div className="w-80 bg-white border-r border-gray-100 flex flex-col">
          {/* Filter Tabs */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {[
                { id: 'all', label: 'All', count: channelCounts.all },
                { id: 'sms', label: 'SMS', count: channelCounts.sms },
                { id: 'email', label: 'Email', count: channelCounts.email },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterChannel(tab.id)}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                    filterChannel === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {/* Template List */}
          <div className="flex-1 overflow-y-auto">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`w-full p-4 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedTemplate?.id === template.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-gray-900 text-sm">{template.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    template.channel === 'sms' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {template.channel.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{template.body}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-2 h-2 rounded-full ${template.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span className="text-xs text-gray-400">{template.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor - Center Panel */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedTemplate ? (
            <>
              {/* Editor Header */}
              <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedTemplate.name}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedTemplate.channel === 'sms' ? 'SMS Template' : 'Email Template'} • {selectedTemplate.key}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-600">Active</span>
                    <button
                      onClick={() => setEditedActive(!editedActive)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        editedActive ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        editedActive ? 'translate-x-5' : 'translate-x-0.5'
                      }`}></div>
                    </button>
                  </label>
                  <button
                    onClick={saveTemplate}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </button>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Subject (for email) */}
                {selectedTemplate.channel === 'email' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
                    <input
                      type="text"
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="Enter email subject..."
                    />
                  </div>
                )}

                {/* Placeholders Help */}
                <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Available Placeholders</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedTemplate.placeholders || {}).map(([key, desc]) => (
                          <button
                            key={key}
                            onClick={() => insertPlaceholder(key)}
                            className="group flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded-md text-xs font-mono text-blue-700 hover:bg-blue-100 transition-colors"
                            title={desc}
                          >
                            {key}
                            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Template Body Editor */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Body
                    {selectedTemplate.channel === 'sms' && preview && (
                      <span className="ml-2 text-gray-400 font-normal">
                        ({preview.character_count} chars, {preview.sms_segments} SMS segment{preview.sms_segments > 1 ? 's' : ''})
                      </span>
                    )}
                  </label>
                  <textarea
                    value={editedBody}
                    onChange={(e) => {
                      setEditedBody(e.target.value);
                      generatePreview(e.target.value, selectedTemplate.key);
                    }}
                    rows={selectedTemplate.channel === 'email' ? 12 : 6}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-sm"
                    placeholder="Enter message template..."
                  />
                </div>

                {/* Character Counter for SMS */}
                {selectedTemplate.channel === 'sms' && (
                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center gap-4">
                      <span className={`${preview && preview.character_count > 160 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {preview?.character_count || 0} / 160 characters
                      </span>
                      {preview && preview.sms_segments > 1 && (
                        <span className="text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Will be sent as {preview.sms_segments} SMS
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => generatePreview(editedBody, selectedTemplate.key)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh Preview
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a template to edit</p>
              </div>
            </div>
          )}
        </div>

        {/* Preview - Right Panel */}
        <div className="w-96 bg-white border-l border-gray-100 flex flex-col">
          {/* Preview Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Live Preview</h3>
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded transition-colors ${
                    previewMode === 'mobile' ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded transition-colors ${
                    previewMode === 'desktop' ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  <Code className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">See how your message will appear to recipients</p>
          </div>

          {/* Preview Content */}
          <div className="flex-1 p-4 bg-gray-50 overflow-y-auto flex items-center justify-center">
            {preview && selectedTemplate ? (
              previewMode === 'mobile' ? (
                <MobilePreview 
                  template={selectedTemplate} 
                  preview={preview}
                />
              ) : (
                <DesktopPreview 
                  template={selectedTemplate} 
                  preview={preview}
                />
              )
            ) : (
              <div className="text-center text-gray-400">
                <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Preview will appear here</p>
              </div>
            )}
          </div>

          {/* Sample Data */}
          {preview && (
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Sample Data Used</h4>
              <div className="space-y-1 text-xs">
                {Object.entries(preview.sample_data).slice(0, 5).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500 font-mono">&#123;&#123;{key}&#125;&#125;</span>
                    <span className="text-gray-700 truncate max-w-[150px]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </EnhancedTenantLayout>
  );
}

// Mobile Phone Mockup Component
function MobilePreview({ template, preview }: { template: Template; preview: PreviewData }) {
  const isSms = template.channel === 'sms';

  return (
    <div className="relative">
      {/* Phone Frame */}
      <div className="w-[280px] h-[560px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
        {/* Screen */}
        <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
          {/* Status Bar */}
          <div className="h-8 bg-gray-100 flex items-center justify-between px-6 text-xs text-gray-600">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 bg-gray-400 rounded-sm"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          </div>

          {/* Notch */}
          <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-full"></div>

          {/* App Header */}
          <div className="h-14 bg-gray-100 border-b border-gray-200 flex items-center px-4">
            {isSms ? (
              <>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm mr-3">
                  FC
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">FlexCloud</div>
                  <div className="text-xs text-gray-500">SMS</div>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm mr-3">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">{template.subject || 'No Subject'}</div>
                  <div className="text-xs text-gray-500">noreply@flexcloud.ng</div>
                </div>
              </>
            )}
          </div>

          {/* Message Content */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {isSms ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{preview.preview}</p>
                  <div className="text-[10px] text-gray-500 text-right mt-1">Now</div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4">
                  <div 
                    className="text-sm text-gray-700 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: preview.preview }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          <div className="h-8 bg-white border-t border-gray-200 flex items-center justify-center">
            <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Side Button */}
      <div className="absolute right-[-2px] top-[100px] w-1 h-16 bg-gray-700 rounded-r-sm"></div>
      <div className="absolute left-[-2px] top-[80px] w-1 h-8 bg-gray-700 rounded-l-sm"></div>
      <div className="absolute left-[-2px] top-[110px] w-1 h-12 bg-gray-700 rounded-l-sm"></div>
      <div className="absolute left-[-2px] top-[130px] w-1 h-12 bg-gray-700 rounded-l-sm"></div>
    </div>
  );
}

// Desktop Preview Component
function DesktopPreview({ template, preview }: { template: Template; preview: PreviewData }) {
  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {template.channel === 'email' ? (
        <>
          {/* Email Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500 mb-1">From: FlexCloud &lt;noreply@flexcloud.ng&gt;</div>
            <div className="text-sm text-gray-500 mb-1">To: business@example.com</div>
            <div className="text-sm font-medium text-gray-900">Subject: {template.subject || 'No Subject'}</div>
          </div>
          {/* Email Body */}
          <div className="p-4">
            <div 
              className="text-sm text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: preview.preview }}
            />
          </div>
        </>
      ) : (
        <>
          {/* SMS Raw Preview */}
          <div className="p-4 bg-gray-900">
            <div className="text-xs text-gray-400 mb-2 font-mono">RAW SMS MESSAGE:</div>
            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap break-all">
              {preview.preview}
            </pre>
          </div>
          <div className="p-3 bg-gray-800 border-t border-gray-700 flex justify-between text-xs text-gray-400 font-mono">
            <span>Characters: {preview.character_count}</span>
            <span>Segments: {preview.sms_segments}</span>
          </div>
        </>
      )}
    </div>
  );
}
