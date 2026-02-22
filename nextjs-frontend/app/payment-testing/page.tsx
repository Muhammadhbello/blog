'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import Link from 'next/link';

interface Business {
  id: number;
  owner_name: string;
  virtual_account_number: string | null;
  virtual_account_bank: string | null;
}

interface Invoice {
  id: number;
  invoice_number: string;
  amount: number;
  status: string;
  business: {
    owner_name: string;
  };
}

export default function PaymentTestingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchData();
    }
  }, [user, isLoading, router]);

  const fetchData = async () => {
    try {
      const [businessesRes, invoicesRes] = await Promise.all([
        apiClient.get('/businesses'),
        apiClient.get('/invoices?status=pending'),
      ]);
      setBusinesses(businessesRes.data.data || businessesRes.data);
      setInvoices(invoicesRes.data.data || invoicesRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const simulatePayment = async () => {
    if (!selectedInvoice) return;

    setProcessing(true);
    setPaymentResult(null);

    try {
      const business = businesses.find(
        b => b.owner_name === selectedInvoice.business.owner_name
      );

      if (!business?.virtual_account_number) {
        alert('Business does not have a virtual account');
        return;
      }

      // Simulate webhook payload
      const webhookPayload = {
        virtual_account: business.virtual_account_number,
        amount: selectedInvoice.amount,
        reference: 'TXN_' + Date.now(),
        source_phone: '+2348012345678',
        destination_account: business.virtual_account_number,
        destinationAmount: selectedInvoice.amount,
        tnxRef: 'REF_' + Date.now(),
        timestamp: new Date().toISOString(),
      };

      // Send to webhook endpoint
      const response = await apiClient.post('/webhooks/payment', webhookPayload);

      // Calculate revenue split (5% platform, 95% LGA)
      const platformFee = selectedInvoice.amount * 0.05;
      const lgaAmount = selectedInvoice.amount * 0.95;

      setPaymentResult({
        success: true,
        invoice: selectedInvoice.invoice_number,
        amount: selectedInvoice.amount,
        platformFee,
        lgaAmount,
        reference: webhookPayload.reference,
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      setPaymentResult({
        success: false,
        error: error.response?.data?.message || 'Payment simulation failed',
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (isLoading || loading) {
    return (
      <div className=\"min-h-screen flex items-center justify-center\">
        <div className=\"animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500\"></div>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50\">
      {/* Header */}
      <nav className=\"bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50\">
        <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
          <div className=\"flex justify-between h-16\">
            <div className=\"flex items-center space-x-4\">
              <Link href=\"/dashboard\" className=\"text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent\">
                FlexCloud
              </Link>
              <span className=\"text-gray-400\">|</span>
              <span className=\"text-gray-700 font-medium\">Payment Testing</span>
            </div>
            <div className=\"flex items-center\">
              <Link href=\"/dashboard\" className=\"text-gray-600 hover:text-gray-900\">← Back to Dashboard</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">
        <div className=\"mb-8\">
          <h1 className=\"text-3xl font-bold text-gray-900\">Payment Testing & Simulation</h1>
          <p className=\"text-gray-600 mt-1\">Test the complete payment flow with webhook simulation</p>
        </div>

        <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-8\">
          {/* Left Column - Invoice Selection */}
          <div className=\"space-y-6\">
            <div className=\"bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6\">
              <h2 className=\"text-xl font-semibold text-gray-900 mb-4\">Select Invoice to Pay</h2>
              
              {invoices.length === 0 ? (
                <div className=\"text-center py-8\">
                  <p className=\"text-gray-500\">No pending invoices available.</p>
                  <Link href=\"/invoices\" className=\"text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block\">
                    Generate an invoice first →
                  </Link>
                </div>
              ) : (
                <div className=\"space-y-3\">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      onClick={() => setSelectedInvoice(invoice)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedInvoice?.id === invoice.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className=\"flex justify-between items-start\">
                        <div>
                          <p className=\"font-semibold text-gray-900\">{invoice.invoice_number}</p>
                          <p className=\"text-sm text-gray-600\">{invoice.business.owner_name}</p>
                        </div>
                        <p className=\"text-lg font-bold text-gray-900\">{formatCurrency(invoice.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedInvoice && (
              <div className=\"bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white\">
                <h3 className=\"text-lg font-semibold mb-4\">Virtual Account Details</h3>
                {(() => {
                  const business = businesses.find(
                    b => b.owner_name === selectedInvoice.business.owner_name
                  );
                  return business?.virtual_account_number ? (
                    <div className=\"space-y-2\">
                      <div>
                        <p className=\"text-sm text-blue-100\">Account Number</p>
                        <p className=\"text-2xl font-bold\">{business.virtual_account_number}</p>
                      </div>
                      <div>
                        <p className=\"text-sm text-blue-100\">Bank</p>
                        <p className=\"text-lg font-medium\">{business.virtual_account_bank}</p>
                      </div>
                      <div>
                        <p className=\"text-sm text-blue-100\">Amount to Pay</p>
                        <p className=\"text-2xl font-bold\">{formatCurrency(selectedInvoice.amount)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className=\"text-yellow-200\">Virtual account not available for this business</p>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Right Column - Payment Simulation */}
          <div className=\"space-y-6\">
            <div className=\"bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6\">
              <h2 className=\"text-xl font-semibold text-gray-900 mb-4\">Simulate Payment</h2>
              
              <div className=\"space-y-4\">
                <div className=\"bg-blue-50 p-4 rounded-xl border border-blue-200\">
                  <p className=\"text-sm text-blue-800\">
                    <strong>How it works:</strong> Click the button below to simulate a bank transfer to the virtual account. 
                    The system will process the webhook, calculate the revenue split (5% FlexCloud / 95% LGA), 
                    and update the invoice status.
                  </p>
                </div>

                <button
                  onClick={simulatePayment}
                  disabled={!selectedInvoice || processing}
                  className=\"w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg\"
                >
                  {processing ? 'Processing Payment...' : 'Simulate Bank Transfer'}
                </button>

                {!selectedInvoice && (
                  <p className=\"text-sm text-gray-500 text-center\">Select an invoice to begin</p>
                )}
              </div>
            </div>

            {/* Payment Result */}
            {paymentResult && (
              <div className={`rounded-2xl shadow-lg p-6 ${
                paymentResult.success 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white' 
                  : 'bg-gradient-to-br from-red-500 to-pink-600 text-white'
              }`}>
                <div className=\"flex items-center mb-4\">
                  {paymentResult.success ? (
                    <svg className=\"w-8 h-8 mr-3\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                      <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z\" />
                    </svg>
                  ) : (
                    <svg className=\"w-8 h-8 mr-3\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                      <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z\" />
                    </svg>
                  )}
                  <h3 className=\"text-xl font-bold\">
                    {paymentResult.success ? 'Payment Successful!' : 'Payment Failed'}
                  </h3>
                </div>

                {paymentResult.success ? (
                  <div className=\"space-y-3\">
                    <div className=\"bg-white/20 p-3 rounded-lg\">
                      <p className=\"text-sm text-green-100\">Invoice</p>
                      <p className=\"font-semibold\">{paymentResult.invoice}</p>
                    </div>
                    <div className=\"bg-white/20 p-3 rounded-lg\">
                      <p className=\"text-sm text-green-100\">Total Amount</p>
                      <p className=\"text-2xl font-bold\">{formatCurrency(paymentResult.amount)}</p>
                    </div>
                    <div className=\"grid grid-cols-2 gap-3\">
                      <div className=\"bg-white/20 p-3 rounded-lg\">
                        <p className=\"text-sm text-green-100\">FlexCloud (5%)</p>
                        <p className=\"font-bold\">{formatCurrency(paymentResult.platformFee)}</p>
                      </div>
                      <div className=\"bg-white/20 p-3 rounded-lg\">
                        <p className=\"text-sm text-green-100\">LGA (95%)</p>
                        <p className=\"font-bold\">{formatCurrency(paymentResult.lgaAmount)}</p>
                      </div>
                    </div>
                    <div className=\"bg-white/20 p-3 rounded-lg\">
                      <p className=\"text-sm text-green-100\">Reference</p>
                      <p className=\"font-mono text-xs\">{paymentResult.reference}</p>
                    </div>
                  </div>
                ) : (
                  <div className=\"bg-white/20 p-3 rounded-lg\">
                    <p className=\"text-sm\">{paymentResult.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
