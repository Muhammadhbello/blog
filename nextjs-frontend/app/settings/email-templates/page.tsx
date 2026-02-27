'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { EnhancedTenantLayout } from '@/components/layout/EnhancedTenantLayout';
import { 
  Mail, 
  Save, 
  Eye, 
  Code, 
  Smartphone, 
  Monitor,
  Sparkles,
  Copy,
  RefreshCw,
  Loader2,
  Check,
  X,
  ChevronDown,
  Palette,
  Type,
  Image,
  Link,
  List,
  AlignLeft,
  Bold,
  Italic,
  Underline,
  Undo,
  Redo,
  Send,
  FileText,
  Lightbulb,
  Maximize2,
  Minimize2,
  TestTube,
  History,
  Download,
  Upload,
  Wand2,
  Layout,
  Zap
} from 'lucide-react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  channel: string;
  key: string;
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
  placeholders: Record<string, string>;
  updated_at: string;
}

interface PreviewData {
  original: string;
  preview: string;
  sample_data: Record<string, string>;
}

const DEFAULT_EMAIL_STYLES = `
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
  .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; }
  .email-header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; }
  .email-header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .email-header .logo { max-width: 150px; margin-bottom: 15px; }
  .email-body { padding: 40px 30px; }
  .email-body h2 { color: #1e40af; margin-top: 0; }
  .email-body p { margin: 0 0 15px 0; }
  .email-body ul { margin: 15px 0; padding-left: 20px; }
  .email-body li { margin: 8px 0; }
  .btn { display: inline-block; padding: 12px 30px; background: #1e40af; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
  .btn:hover { background: #1e3a8a; }
  .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
  .email-footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
  .email-footer p { color: #64748b; font-size: 13px; margin: 5px 0; }
  .email-footer a { color: #3b82f6; text-decoration: none; }
  .amount { font-size: 28px; font-weight: 700; color: #059669; }
  .invoice-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
  .invoice-details table { width: 100%; border-collapse: collapse; }
  .invoice-details td { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
  .invoice-details td:last-child { text-align: right; font-weight: 600; }
</style>
`;

const EMAIL_SNIPPETS = [
  {
    name: 'Header with Logo',
    code: `<div class="email-header">
  <img src="{{logo_url}}" alt="Logo" class="logo">
  <h1>{{tenant_name}}</h1>
</div>`,
  },
  {
    name: 'Call to Action Button',
    code: `<a href="{{action_url}}" class="btn">{{button_text}}</a>`,
  },
  {
    name: 'Invoice Details Table',
    code: `<div class="invoice-details">
  <table>
    <tr><td>Invoice Number</td><td>#{{invoice_number}}</td></tr>
    <tr><td>Amount Due</td><td>{{amount}}</td></tr>
    <tr><td>Due Date</td><td>{{due_date}}</td></tr>
  </table>
</div>`,
  },
  {
    name: 'Highlight Box',
    code: `<div class="highlight">
  <strong>Important:</strong> {{message}}
</div>`,
  },
  {
    name: 'Amount Display',
    code: `<p class="amount">{{amount}}</p>`,
  },
  {
    name: 'Footer',
    code: `<div class="email-footer">
  <p>{{tenant_name}}</p>
  <p>{{tenant_address}}</p>
  <p><a href="mailto:{{support_email}}">{{support_email}}</a> | <a href="tel:{{support_phone}}">{{support_phone}}</a></p>
  <p style="margin-top: 15px; font-size: 11px;">This is an automated message. Please do not reply directly to this email.</p>
</div>`,
  },
];

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [editedActive, setEditedActive] = useState(true);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'code'>('desktop');
  const [showSnippets, setShowSnippets] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [editorTab, setEditorTab] = useState<'visual' | 'html'>('html');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setEditedSubject(selectedTemplate.subject || '');
      setEditedBody(selectedTemplate.body);
      setEditedActive(selectedTemplate.is_active);
      setHistory([selectedTemplate.body]);
      setHistoryIndex(0);
      generatePreview(selectedTemplate.body, selectedTemplate.key);
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const response = await apiClient.get('/api/tenant/templates');
      const emailTemplates = response.data.templates.filter(
        (t: EmailTemplate) => t.channel === 'email'
      );
      setTemplates(emailTemplates);
      if (emailTemplates.length > 0) {
        setSelectedTemplate(emailTemplates[0]);
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
      // Generate local preview with sample data
      const sampleData: Record<string, string> = {
        business_name: 'ABC Ventures Ltd',
        invoice_number: 'INV-2025-001234',
        amount: '₦125,000.00',
        due_date: '15 January 2025',
        payment_link: 'https://pay.flexcloud.ng/inv/abc123',
        receipt_number: 'RCP-2025-005678',
        payment_date: '10 January 2025',
        tenant_name: 'Potiskum LGA Revenue Office',
        tenant_address: 'Revenue House, Government Area, Potiskum',
        support_email: 'support@potiskum.gov.ng',
        support_phone: '+234 800 123 4567',
        logo_url: 'https://via.placeholder.com/150x50/1e40af/ffffff?text=FlexCloud',
        action_url: '#',
        button_text: 'Pay Now',
      };

      let preview = body;
      Object.entries(sampleData).forEach(([key, value]) => {
        preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });

      setPreview({
        original: body,
        preview,
        sample_data: sampleData,
      });
    }
  };

  const handleBodyChange = useCallback((newBody: string) => {
    setEditedBody(newBody);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBody);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    generatePreview(newBody, selectedTemplate?.key || '');
  }, [history, historyIndex, selectedTemplate?.key]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setEditedBody(history[historyIndex - 1]);
      generatePreview(history[historyIndex - 1], selectedTemplate?.key || '');
    }
  }, [history, historyIndex, selectedTemplate?.key]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setEditedBody(history[historyIndex + 1]);
      generatePreview(history[historyIndex + 1], selectedTemplate?.key || '');
    }
  }, [history, historyIndex, selectedTemplate?.key]);

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    
    setSaving(true);
    try {
      await apiClient.put(`/api/tenant/templates/${selectedTemplate.id}`, {
        name: selectedTemplate.name,
        subject: editedSubject,
        body: editedBody,
        is_active: editedActive,
      });
      toast.success('Email template saved successfully');
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const insertSnippet = (code: string) => {
    const newBody = editedBody + '\n' + code;
    handleBodyChange(newBody);
    setShowSnippets(false);
  };

  const insertPlaceholder = (placeholder: string) => {
    handleBodyChange(editedBody + placeholder);
  };

  const sendTestEmail = async () => {
    try {
      await apiClient.post('/api/notifications/email/test', {
        template_id: selectedTemplate?.id,
        subject: editedSubject,
        body: editedBody,
      });
      toast.success('Test email sent to your registered email');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send test email');
    }
  };

  const wrapWithStyles = (html: string) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${DEFAULT_EMAIL_STYLES}
</head>
<body>
  <div class="email-container">
    ${html}
  </div>
</body>
</html>`;
  };

  if (loading) {
    return (
      <EnhancedTenantLayout title="Email Templates" subtitle="Design beautiful email notifications">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </EnhancedTenantLayout>
    );
  }

  return (
    <EnhancedTenantLayout title="Email Templates" subtitle="Design beautiful HTML email notifications">
      <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-[calc(100vh-180px)]'} flex`}>
        {/* Template List - Left Sidebar */}
        {!isFullscreen && (
          <div className="w-64 bg-white border-r border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Templates
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full p-3 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-1 truncate">{template.subject}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`w-2 h-2 rounded-full ${template.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span className="text-xs text-gray-400">{template.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editor - Center */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedTemplate ? (
            <>
              {/* Editor Toolbar */}
              <div className="bg-white border-b border-gray-100 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                    title="Undo"
                  >
                    <Undo className="h-4 w-4" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                    title="Redo"
                  >
                    <Redo className="h-4 w-4" />
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-2"></div>
                  <button
                    onClick={() => setShowSnippets(!showSnippets)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      showSnippets ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    Snippets
                  </button>
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 hover:bg-gray-100 rounded"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
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
                    onClick={sendTestEmail}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-700"
                  >
                    <Send className="h-4 w-4" />
                    Test
                  </button>
                  <button
                    onClick={saveTemplate}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </button>
                </div>
              </div>

              {/* Snippets Panel */}
              {showSnippets && (
                <div className="bg-white border-b border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-gray-900">Quick Snippets</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EMAIL_SNIPPETS.map((snippet, i) => (
                      <button
                        key={i}
                        onClick={() => insertSnippet(snippet.code)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-700 transition-colors"
                      >
                        {snippet.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject & Body Editor */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Enter email subject..."
                  />
                </div>

                {/* Placeholders */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
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

                {/* HTML Editor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Body (HTML)
                  </label>
                  <textarea
                    value={editedBody}
                    onChange={(e) => handleBodyChange(e.target.value)}
                    rows={20}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-sm"
                    placeholder="Enter HTML content..."
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a template to edit</p>
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel - Right */}
        <div className="w-[500px] bg-white border-l border-gray-100 flex flex-col">
          {/* Preview Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Live Preview</h3>
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded transition-colors ${previewMode === 'desktop' ? 'bg-white shadow-sm' : ''}`}
                  title="Desktop View"
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded transition-colors ${previewMode === 'mobile' ? 'bg-white shadow-sm' : ''}`}
                  title="Mobile View"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPreviewMode('code')}
                  className={`p-1.5 rounded transition-colors ${previewMode === 'code' ? 'bg-white shadow-sm' : ''}`}
                  title="Source Code"
                >
                  <Code className="h-4 w-4" />
                </button>
              </div>
            </div>
            {selectedTemplate && (
              <div className="text-sm text-gray-500 truncate">
                Subject: {editedSubject || '(No subject)'}
              </div>
            )}
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-4 bg-gray-100">
            {preview && selectedTemplate ? (
              <>
                {previewMode === 'desktop' && (
                  <DesktopEmailPreview html={wrapWithStyles(preview.preview)} />
                )}
                {previewMode === 'mobile' && (
                  <MobileEmailPreview html={wrapWithStyles(preview.preview)} subject={editedSubject} />
                )}
                {previewMode === 'code' && (
                  <CodePreview html={wrapWithStyles(editedBody)} />
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Preview will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </EnhancedTenantLayout>
  );
}

// Desktop Email Preview
function DesktopEmailPreview({ html }: { html: string }) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Email Client Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="px-4 py-1 bg-white rounded border text-xs text-gray-500">
            Email Preview
          </div>
        </div>
      </div>
      
      {/* Email Content */}
      <iframe
        srcDoc={html}
        className="w-full h-[600px] border-0"
        title="Email Preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}

// Mobile Email Preview (iPhone mockup)
function MobileEmailPreview({ html, subject }: { html: string; subject: string }) {
  return (
    <div className="flex justify-center">
      <div className="relative">
        {/* Phone Frame */}
        <div className="w-[320px] h-[640px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
          {/* Screen */}
          <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
            {/* Status Bar */}
            <div className="h-8 bg-gray-100 flex items-center justify-between px-6 text-xs text-gray-600">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2 bg-gray-400 rounded-sm"></div>
              </div>
            </div>

            {/* Notch */}
            <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-full"></div>

            {/* Email App Header */}
            <div className="h-14 bg-gray-100 border-b border-gray-200 flex items-center px-4">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm truncate">{subject || 'No Subject'}</div>
                <div className="text-xs text-gray-500">From: FlexCloud</div>
              </div>
            </div>

            {/* Email Content */}
            <div className="flex-1 overflow-hidden">
              <iframe
                srcDoc={html}
                className="w-full h-full border-0 scale-[0.85] origin-top-left"
                style={{ width: '118%', height: '118%' }}
                title="Mobile Email Preview"
                sandbox="allow-same-origin"
              />
            </div>

            {/* Bottom Bar */}
            <div className="h-8 bg-white border-t border-gray-200 flex items-center justify-center">
              <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Side Buttons */}
        <div className="absolute right-[-2px] top-[100px] w-1 h-16 bg-gray-700 rounded-r-sm"></div>
        <div className="absolute left-[-2px] top-[80px] w-1 h-8 bg-gray-700 rounded-l-sm"></div>
        <div className="absolute left-[-2px] top-[110px] w-1 h-12 bg-gray-700 rounded-l-sm"></div>
      </div>
    </div>
  );
}

// Code Preview
function CodePreview({ html }: { html: string }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(html);
    toast.success('HTML copied to clipboard');
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">HTML Source</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <Copy className="h-3 w-3" />
          Copy
        </button>
      </div>
      <pre className="p-4 text-xs text-green-400 font-mono overflow-auto max-h-[550px] whitespace-pre-wrap">
        {html}
      </pre>
    </div>
  );
}
