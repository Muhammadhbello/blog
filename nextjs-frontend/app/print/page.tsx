'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api';

interface PrintData {
  tenant: Record<string, string>;
  print_config: {
    paper_size: string;
    show_logo: boolean;
    show_qr: boolean;
    thermal_width: string;
    footer_text: string;
  };
}

interface TicketPrintData extends PrintData {
  ticket: {
    id: number;
    ticket_number: string;
    amount: number;
    status: string;
    sold_at: string;
    valid_until: string;
    batch_number: string;
    unit_price: number;
    validity_days: number;
    revenue_point_name: string;
    revenue_point_code: string;
    revenue_item_name: string;
    seller_name: string;
  };
}

interface PaymentReceiptData extends PrintData {
  payment: {
    id: number;
    amount: number;
    payment_method: string;
    reference: string;
    created_at: string;
    invoice_number: string;
    total_amount: number;
    remaining_balance: number;
    business_name: string;
    owner_name: string;
    owner_phone: string;
    business_address: string;
    receiver_name: string;
  };
}

export default function PrintPage() {
  const searchParams = useSearchParams();
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [printType, setPrintType] = useState<string>('');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    
    if (type && id) {
      setPrintType(type);
      fetchPrintData(type, id);
    }
  }, [searchParams]);

  const fetchPrintData = async (type: string, id: string) => {
    try {
      let endpoint = '';
      switch (type) {
        case 'ticket':
          endpoint = `/print/ticket/${id}`;
          break;
        case 'payment':
          endpoint = `/print/payment/${id}/receipt`;
          break;
        case 'invoice':
          endpoint = `/print/invoice/${id}`;
          break;
        case 'closing':
          endpoint = `/print/closing/${id}/receipt`;
          break;
        default:
          throw new Error('Invalid print type');
      }
      
      const response = await apiClient.get(endpoint);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch print data', error);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600">Failed to load print data</p>
          <button
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const tenantName = data.tenant?.tenant_name || 'FlexCloud LGA';
  const tenantAddress = data.tenant?.tenant_address || '';
  const tenantPhone = data.tenant?.tenant_phone || '';
  const config = data.print_config || {};
  const paperWidth = config.thermal_width === '58' ? '58mm' : '80mm';

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden max-w-md mx-auto mb-4 flex justify-between items-center">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>Print</span>
        </button>
      </div>

      {/* Printable Receipt */}
      <div 
        ref={printRef}
        className="mx-auto bg-white shadow-lg print:shadow-none"
        style={{ 
          width: paperWidth, 
          maxWidth: '100%',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}
      >
        {/* Ticket Receipt */}
        {printType === 'ticket' && data.ticket && (
          <div className="p-4">
            {/* Header */}
            <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
              <h1 className="text-lg font-bold">{tenantName}</h1>
              {tenantAddress && <p className="text-xs">{tenantAddress}</p>}
              {tenantPhone && <p className="text-xs">Tel: {tenantPhone}</p>}
              <p className="text-sm font-bold mt-2">TICKET RECEIPT</p>
            </div>

            {/* Ticket Details */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Ticket No:</span>
                <span className="font-bold">{data.ticket.ticket_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Batch:</span>
                <span>{data.ticket.batch_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Location:</span>
                <span>{data.ticket.revenue_point_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Item:</span>
                <span>{data.ticket.revenue_item_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Date/Time:</span>
                <span>{formatDate(data.ticket.sold_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Valid Until:</span>
                <span>{formatDate(data.ticket.valid_until)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sold By:</span>
                <span>{data.ticket.seller_name || '-'}</span>
              </div>
            </div>

            {/* Amount */}
            <div className="border-t border-dashed border-gray-400 mt-3 pt-3">
              <div className="flex justify-between text-sm font-bold">
                <span>AMOUNT PAID:</span>
                <span>{formatCurrency(data.ticket.amount)}</span>
              </div>
            </div>

            {/* QR Code Placeholder */}
            {config.show_qr && (
              <div className="text-center mt-4">
                <div className="inline-block p-2 border border-gray-300">
                  <div className="w-20 h-20 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                    QR: {data.ticket.ticket_number}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs mt-4 pt-3 border-t border-dashed border-gray-400">
              <p>{config.footer_text || 'Thank you for your payment'}</p>
              <p className="text-gray-500 mt-2">Powered by FlexCloud</p>
            </div>
          </div>
        )}

        {/* Payment Receipt */}
        {printType === 'payment' && data.payment && (
          <div className="p-4">
            {/* Header */}
            <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
              <h1 className="text-lg font-bold">{tenantName}</h1>
              {tenantAddress && <p className="text-xs">{tenantAddress}</p>}
              {tenantPhone && <p className="text-xs">Tel: {tenantPhone}</p>}
              <p className="text-sm font-bold mt-2">PAYMENT RECEIPT</p>
            </div>

            {/* Payment Details */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Receipt No:</span>
                <span className="font-bold">{data.payment.reference}</span>
              </div>
              <div className="flex justify-between">
                <span>Invoice:</span>
                <span>{data.payment.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Business:</span>
                <span>{data.payment.business_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Payer:</span>
                <span>{data.payment.owner_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Date/Time:</span>
                <span>{formatDate(data.payment.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Method:</span>
                <span className="uppercase">{data.payment.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span>Received By:</span>
                <span>{data.payment.receiver_name || '-'}</span>
              </div>
            </div>

            {/* Amounts */}
            <div className="border-t border-dashed border-gray-400 mt-3 pt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Invoice Total:</span>
                <span>{formatCurrency(data.payment.total_amount)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>AMOUNT PAID:</span>
                <span>{formatCurrency(data.payment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Balance:</span>
                <span>{formatCurrency(data.payment.remaining_balance)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs mt-4 pt-3 border-t border-dashed border-gray-400">
              <p>{config.footer_text || 'Thank you for your payment'}</p>
              <p className="text-gray-500 mt-2">Powered by FlexCloud</p>
            </div>
          </div>
        )}

        {/* Invoice Print */}
        {printType === 'invoice' && data.invoice && (
          <div className="p-4" style={{ width: '210mm', maxWidth: '100%', fontSize: '11px' }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-4">
              <div>
                <h1 className="text-xl font-bold">{tenantName}</h1>
                {tenantAddress && <p className="text-sm">{tenantAddress}</p>}
                {tenantPhone && <p className="text-sm">Tel: {tenantPhone}</p>}
                {data.tenant?.tenant_email && <p className="text-sm">Email: {data.tenant.tenant_email}</p>}
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-700">INVOICE</h2>
                <p className="text-lg font-bold">{data.invoice.invoice_number}</p>
                <p className={`inline-block px-2 py-1 rounded text-xs font-bold mt-1 ${
                  data.invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                  data.invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {data.invoice.status?.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <p className="text-xs font-bold text-gray-500 mb-1">BILL TO:</p>
                <p className="font-bold">{data.invoice.business_name}</p>
                <p>{data.invoice.owner_name}</p>
                <p>{data.invoice.business_address}</p>
                <p>Phone: {data.invoice.owner_phone}</p>
                {data.invoice.owner_email && <p>Email: {data.invoice.owner_email}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Reg. No: {data.invoice.registration_number}</p>
                <p className="text-xs text-gray-500">Ward: {data.invoice.ward_name}</p>
                <p className="text-xs text-gray-500 mt-2">Issue Date: {formatDate(data.invoice.issued_at)}</p>
                <p className="text-xs font-bold text-red-600">Due Date: {formatDate(data.invoice.due_date)}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-6 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left py-2 px-3 border">#</th>
                  <th className="text-left py-2 px-3 border">Description</th>
                  <th className="text-right py-2 px-3 border">Qty</th>
                  <th className="text-right py-2 px-3 border">Unit Price</th>
                  <th className="text-right py-2 px-3 border">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((item: any, index: number) => (
                  <tr key={item.id}>
                    <td className="py-2 px-3 border">{index + 1}</td>
                    <td className="py-2 px-3 border">{item.item_name || item.description}</td>
                    <td className="py-2 px-3 border text-right">{item.quantity}</td>
                    <td className="py-2 px-3 border text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 px-3 border text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-1">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(data.invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Tax:</span>
                  <span>{formatCurrency(data.invoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-gray-800 font-bold text-lg">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(data.invoice.total_amount)}</span>
                </div>
                <div className="flex justify-between py-1 text-green-600">
                  <span>Paid:</span>
                  <span>{formatCurrency(data.invoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-red-600">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(data.invoice.balance)}</span>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            {data.tenant?.bank_name && (
              <div className="mt-6 p-4 bg-gray-50 rounded">
                <p className="font-bold text-sm mb-2">PAYMENT DETAILS:</p>
                <p className="text-sm">Bank: {data.tenant.bank_name}</p>
                <p className="text-sm">Account Name: {data.tenant.bank_account_name}</p>
                <p className="text-sm">Account Number: {data.tenant.bank_account_number}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs mt-8 pt-4 border-t">
              <p className="text-gray-500">Thank you for your business!</p>
              <p className="text-gray-400 mt-2">Powered by FlexCloud Revenue Management System</p>
            </div>
          </div>
        )}

        {/* Closing Receipt */}
        {printType === 'closing' && data.closing && (
          <div className="p-4">
            {/* Header */}
            <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
              <h1 className="text-lg font-bold">{tenantName}</h1>
              <p className="text-sm font-bold mt-2">CLOSING RECEIPT</p>
            </div>

            {/* Closing Details */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formatDate(data.closing.closing_date)}</span>
              </div>
              <div className="flex justify-between">
                <span>Collector:</span>
                <span>{data.closing.collector_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="uppercase">{data.closing.closing_type}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-bold ${
                  data.closing.status === 'approved' ? 'text-green-600' :
                  data.closing.status === 'rejected' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>{data.closing.status?.toUpperCase()}</span>
              </div>
            </div>

            {/* Amounts */}
            <div className="border-t border-dashed border-gray-400 mt-3 pt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Tickets Sold:</span>
                <span>{data.closing.ticket_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Invoice Payments:</span>
                <span>{data.closing.invoice_payment_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Expected:</span>
                <span>{formatCurrency(data.closing.expected_amount)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>ACTUAL:</span>
                <span>{formatCurrency(data.closing.actual_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Variance:</span>
                <span className={data.closing.variance < 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(data.closing.variance)} ({data.closing.variance_percentage?.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Approval */}
            {data.closing.reviewed_by && (
              <div className="border-t border-dashed border-gray-400 mt-3 pt-3 text-xs">
                <div className="flex justify-between">
                  <span>Reviewed By:</span>
                  <span>{data.closing.reviewer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reviewed At:</span>
                  <span>{formatDate(data.closing.reviewed_at)}</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs mt-4 pt-3 border-t border-dashed border-gray-400">
              <p className="text-gray-500 mt-2">Powered by FlexCloud</p>
            </div>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 0;
            size: ${paperWidth} auto;
          }
        }
      `}</style>
    </div>
  );
}
