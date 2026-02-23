'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';

interface Invoice {
  id: number;
  invoice_number: string;
  business: {
    id: number;
    business_name: string;
    registration_number: string;
    owner_name: string;
    owner_phone: string;
    address: string;
    ward_name: string;
  };
  items: {
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }[];
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  due_date: string;
  issued_at: string;
  created_at: string;
  tenant: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

export default function InvoicePrintPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user && params.id) {
      fetchInvoice();
    }
  }, [user, isLoading, params.id]);

  const fetchInvoice = async () => {
    try {
      const response = await apiClient.get(`/invoices/${params.id}`);
      setInvoice(response.data);
    } catch (error) {
      console.error('Failed to fetch invoice', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Invoice not found</p>
      </div>
    );
  }

  return (
    <>
      {/* Print Controls - Hidden in Print */}
      <div className="print:hidden bg-gray-100 p-4 sticky top-0 z-50 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back</span>
        </button>
        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
          data-testid="print-invoice-btn"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>Print Invoice</span>
        </button>
      </div>

      {/* Invoice Content */}
      <div ref={printRef} className="max-w-4xl mx-auto p-8 bg-white print:p-0 print:shadow-none">
        {/* Header */}
        <div className="border-b-4 border-blue-600 pb-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{invoice.tenant?.name || 'FlexCloud LGA'}</h1>
              <p className="text-gray-600 mt-1">{invoice.tenant?.address || 'Local Government Area'}</p>
              <p className="text-gray-600">{invoice.tenant?.phone}</p>
              <p className="text-gray-600">{invoice.tenant?.email}</p>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-bold text-blue-600">INVOICE</h2>
              <p className="text-xl font-semibold text-gray-700 mt-2">{invoice.invoice_number}</p>
              <div className={`mt-2 inline-block px-4 py-1 rounded-full text-sm font-semibold ${
                invoice.status === 'paid' 
                  ? 'bg-green-100 text-green-700'
                  : invoice.status === 'overdue'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {invoice.status.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Billing Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-lg text-gray-900">{invoice.business.business_name}</p>
              <p className="text-gray-600">{invoice.business.owner_name}</p>
              <p className="text-gray-600">{invoice.business.address}</p>
              <p className="text-gray-600">{invoice.business.owner_phone}</p>
              <p className="text-sm text-gray-500 mt-2">Reg. No: {invoice.business.registration_number}</p>
              <p className="text-sm text-gray-500">Ward: {invoice.business.ward_name}</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Invoice Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Date:</span>
                <span className="font-medium text-gray-900">{formatDate(invoice.issued_at || invoice.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span className="font-medium text-gray-900">{formatDate(invoice.due_date)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-600">Invoice Number:</span>
                <span className="font-mono font-medium text-gray-900">{invoice.invoice_number}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left px-4 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">Description</th>
                <th className="text-center px-4 py-3 font-semibold">Qty</th>
                <th className="text-right px-4 py-3 font-semibold">Unit Price</th>
                <th className="text-right px-4 py-3 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                  <td className="px-4 py-3 text-gray-900">{item.description}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="border-t-2 border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (0%):</span>
                <span className="font-medium">{formatCurrency(0)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              {invoice.amount_paid > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Amount Paid:</span>
                    <span className="font-medium">-{formatCurrency(invoice.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-blue-600 border-t-2 border-blue-600 pt-2">
                    <span>Balance Due:</span>
                    <span>{formatCurrency(invoice.balance)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3">Payment Information</h3>
          <p className="text-blue-800">
            Please make payment to the following account or use the payment link provided:
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-600">Account Name</p>
              <p className="font-semibold text-blue-900">{invoice.tenant?.name || 'FlexCloud LGA'}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Account Number</p>
              <p className="font-semibold text-blue-900 font-mono">{invoice.business.registration_number}-VA</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 text-center text-gray-500 text-sm">
          <p>Thank you for your prompt payment.</p>
          <p className="mt-2">This is a computer-generated invoice. No signature required.</p>
          <p className="mt-4 text-xs">
            Generated by FlexCloud Revenue Management System on {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #__next {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </>
  );
}
