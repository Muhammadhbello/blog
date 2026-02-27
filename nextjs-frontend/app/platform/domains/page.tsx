'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface DomainStatus {
  has_custom_domain: boolean;
  custom_domain: string | null;
  is_verified: boolean;
  verified_at: string | null;
  verification_token: string | null;
  ssl_enabled: boolean;
  ssl_expires_at: string | null;
  ssl_expires_in_days: number | null;
  default_subdomain: string;
  urls: {
    subdomain: string;
    custom: string | null;
  };
}

interface Tenant {
  id: number;
  name: string;
  slug: string;
  subdomain: string;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  ssl_enabled: boolean;
  ssl_expires_at: string | null;
}

interface VerificationInstructions {
  dns_txt: {
    type: string;
    host: string;
    value: string;
    instructions: string;
  };
  cname: {
    type: string;
    host: string;
    value: string;
    instructions: string;
  };
}

export default function DomainsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [verificationInstructions, setVerificationInstructions] = useState<VerificationInstructions | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await apiClient.get('/platform/tenants');
      setTenants(res.data.data || res.data);
    } catch (error) {
      console.error('Failed to fetch tenants', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    try {
      const res = await apiClient.get(`/platform/domains/tenant/${tenant.slug}`);
      setDomainStatus(res.data);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to load domain status');
    }
  };

  const setCustomDomain = async () => {
    if (!selectedTenant || !newDomain) return;
    setProcessing(true);

    try {
      const res = await apiClient.post(`/platform/domains/tenant/${selectedTenant.slug}`, {
        domain: newDomain,
      });

      if (res.data.success) {
        toast.success('Domain configured. Please verify ownership.');
        setVerificationInstructions(res.data.verification_methods);
        // Refresh status
        const statusRes = await apiClient.get(`/platform/domains/tenant/${selectedTenant.slug}`);
        setDomainStatus(statusRes.data);
        fetchTenants();
      } else {
        toast.error(res.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to set domain');
    } finally {
      setProcessing(false);
    }
  };

  const verifyDomain = async () => {
    if (!selectedTenant) return;
    setProcessing(true);

    try {
      const res = await apiClient.post(`/platform/domains/tenant/${selectedTenant.slug}/verify`);

      if (res.data.success) {
        toast.success('Domain verified successfully!');
        // Refresh status
        const statusRes = await apiClient.get(`/platform/domains/tenant/${selectedTenant.slug}`);
        setDomainStatus(statusRes.data);
        fetchTenants();
      } else {
        toast.error(res.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setProcessing(false);
    }
  };

  const enableSsl = async () => {
    if (!selectedTenant) return;
    setProcessing(true);

    try {
      const res = await apiClient.post(`/platform/domains/tenant/${selectedTenant.slug}/ssl`);

      if (res.data.success) {
        toast.success('SSL certificate provisioned!');
        const statusRes = await apiClient.get(`/platform/domains/tenant/${selectedTenant.slug}`);
        setDomainStatus(statusRes.data);
        fetchTenants();
      } else {
        toast.error(res.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to enable SSL');
    } finally {
      setProcessing(false);
    }
  };

  const removeDomain = async () => {
    if (!selectedTenant) return;
    if (!confirm('Are you sure you want to remove this custom domain?')) return;

    setProcessing(true);

    try {
      await apiClient.delete(`/platform/domains/tenant/${selectedTenant.slug}`);
      toast.success('Domain removed');
      setShowModal(false);
      setSelectedTenant(null);
      setDomainStatus(null);
      fetchTenants();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove domain');
    } finally {
      setProcessing(false);
    }
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
            <h1 className="text-xl font-bold">Custom Domains</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-6 mb-8 border border-blue-500/20">
          <h2 className="text-lg font-semibold mb-2">Custom Domain Configuration</h2>
          <p className="text-gray-300 text-sm">
            Allow tenants to use their own branded domains (e.g., revenue.potiskum.gov.ng) instead of the default FlexCloud subdomain.
            Custom domains require DNS verification and can have SSL certificates automatically provisioned.
          </p>
        </div>

        {/* Tenants Table */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-semibold">Tenant Domains</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Tenant</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Default Subdomain</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Custom Domain</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-400">Status</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-400">SSL</th>
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
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-white/10 rounded text-sm text-blue-300">
                      {tenant.subdomain}.flexcloud.ng
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    {tenant.custom_domain ? (
                      <code className="px-2 py-1 bg-purple-500/20 rounded text-sm text-purple-300">
                        {tenant.custom_domain}
                      </code>
                    ) : (
                      <span className="text-gray-500">Not configured</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {tenant.custom_domain ? (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tenant.custom_domain_verified
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {tenant.custom_domain_verified ? 'Verified' : 'Pending'}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {tenant.ssl_enabled ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                        Active
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(tenant)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition"
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Domain Modal */}
      {showModal && selectedTenant && domainStatus && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Domain Configuration</h2>
              <p className="text-gray-400 text-sm mt-1">{selectedTenant.name}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Status */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="font-medium mb-3">Current Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Default URL</p>
                    <p className="font-medium">{domainStatus.urls.subdomain}</p>
                  </div>
                  {domainStatus.custom_domain && (
                    <div>
                      <p className="text-gray-400">Custom URL</p>
                      <p className="font-medium">{domainStatus.urls.custom}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Set Domain */}
              {!domainStatus.has_custom_domain && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Set Custom Domain
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="revenue.example.gov.ng"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={setCustomDomain}
                      disabled={!newDomain || processing}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition disabled:opacity-50"
                    >
                      {processing ? 'Setting...' : 'Set Domain'}
                    </button>
                  </div>
                </div>
              )}

              {/* Verification Instructions */}
              {domainStatus.has_custom_domain && !domainStatus.is_verified && (
                <div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                    <p className="text-amber-400 font-medium">Domain Pending Verification</p>
                    <p className="text-amber-300/70 text-sm mt-1">
                      Add one of the following DNS records to verify ownership:
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* TXT Record */}
                    <div className="bg-white/5 rounded-xl p-4">
                      <h4 className="font-medium mb-2">Option 1: TXT Record</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-400">Host</p>
                          <code className="text-blue-300">_flexcloud.{domainStatus.custom_domain}</code>
                        </div>
                        <div>
                          <p className="text-gray-400">Value</p>
                          <code className="text-blue-300 text-xs break-all">{domainStatus.verification_token}</code>
                        </div>
                      </div>
                    </div>

                    {/* CNAME Record */}
                    <div className="bg-white/5 rounded-xl p-4">
                      <h4 className="font-medium mb-2">Option 2: CNAME Record</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-400">Host</p>
                          <code className="text-blue-300">{domainStatus.custom_domain}</code>
                        </div>
                        <div>
                          <p className="text-gray-400">Points To</p>
                          <code className="text-blue-300">custom.flexcloud.ng</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={verifyDomain}
                    disabled={processing}
                    className="w-full mt-4 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-medium transition disabled:opacity-50"
                  >
                    {processing ? 'Verifying...' : 'Check Verification'}
                  </button>
                </div>
              )}

              {/* Verified Domain - SSL */}
              {domainStatus.has_custom_domain && domainStatus.is_verified && (
                <div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                    <p className="text-green-400 font-medium">✓ Domain Verified</p>
                    <p className="text-green-300/70 text-sm mt-1">
                      Verified on {new Date(domainStatus.verified_at!).toLocaleDateString()}
                    </p>
                  </div>

                  {/* SSL Status */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">SSL Certificate</h4>
                        {domainStatus.ssl_enabled ? (
                          <p className="text-sm text-gray-400">
                            Expires in {domainStatus.ssl_expires_in_days} days
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">Not enabled</p>
                        )}
                      </div>
                      {domainStatus.ssl_enabled ? (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={enableSsl}
                          disabled={processing}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition disabled:opacity-50"
                        >
                          {processing ? 'Enabling...' : 'Enable SSL'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Remove Domain */}
              {domainStatus.has_custom_domain && (
                <button
                  onClick={removeDomain}
                  disabled={processing}
                  className="w-full px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-medium transition border border-red-600/30 disabled:opacity-50"
                >
                  Remove Custom Domain
                </button>
              )}
            </div>

            <div className="p-6 border-t border-white/10">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedTenant(null);
                  setDomainStatus(null);
                  setVerificationInstructions(null);
                  setNewDomain('');
                }}
                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
