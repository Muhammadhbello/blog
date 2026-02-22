<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Defaulter;
use App\Models\Invoice;
use App\Models\Business;
use Carbon\Carbon;

class DefaulterController extends Controller
{
    public function detectDefaulters()
    {
        $tenantId = auth()->user()->tenant_id;
        
        // Find overdue invoices
        $overdueInvoices = Invoice::where('tenant_id', $tenantId)
            ->where('status', 'pending')
            ->where('due_date', '<', Carbon::now())
            ->with('business')
            ->get();

        $defaultersCreated = 0;

        foreach ($overdueInvoices as $invoice) {
            $daysOverdue = Carbon::now()->diffInDays($invoice->due_date);

            // Check if defaulter record already exists
            $defaulter = Defaulter::where('tenant_id', $tenantId)
                ->where('business_id', $invoice->business_id)
                ->first();

            if ($defaulter) {
                // Update existing record
                $defaulter->update([
                    'amount_due' => $defaulter->amount_due + $invoice->amount,
                    'days_overdue' => max($defaulter->days_overdue, $daysOverdue),
                ]);
            } else {
                // Create new defaulter record
                Defaulter::create([
                    'tenant_id' => $tenantId,
                    'business_id' => $invoice->business_id,
                    'amount_due' => $invoice->amount,
                    'days_overdue' => $daysOverdue,
                ]);
                $defaultersCreated++;
            }

            // Update invoice status
            $invoice->update(['status' => 'overdue']);
        }

        return response()->json([
            'message' => "Detected {$defaultersCreated} new defaulters",
            'total_overdue_invoices' => $overdueInvoices->count(),
        ]);
    }

    public function getDefaulters(Request $request)
    {
        $query = Defaulter::with(['business'])
            ->where('tenant_id', auth()->user()->tenant_id);

        if ($request->has('min_days')) {
            $query->where('days_overdue', '>=', $request->min_days);
        }

        $defaulters = $query->orderBy('amount_due', 'desc')->get();

        return response()->json($defaulters);
    }

    public function sendReminder(Request $request, Defaulter $defaulter)
    {
        if ($defaulter->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Mock SMS sending (will integrate Twilio in service)
        $smsService = app(\App\Services\SmsService::class);
        $result = $smsService->sendDefaulterReminder($defaulter);

        if ($result['success']) {
            $defaulter->update([
                'last_reminder_sent' => now(),
                'reminder_count' => $defaulter->reminder_count + 1,
            ]);

            return response()->json([
                'message' => 'Reminder sent successfully',
                'defaulter' => $defaulter,
            ]);
        }

        return response()->json([
            'message' => 'Failed to send reminder',
            'error' => $result['error'] ?? 'Unknown error',
        ], 500);
    }

    public function sendBulkReminders(Request $request)
    {
        $validated = $request->validate([
            'min_days_overdue' => 'required|integer|min:1',
        ]);

        $defaulters = Defaulter::where('tenant_id', auth()->user()->tenant_id)
            ->where('days_overdue', '>=', $validated['min_days_overdue'])
            ->with('business')
            ->get();

        $smsService = app(\App\Services\SmsService::class);
        $sent = 0;
        $failed = 0;

        foreach ($defaulters as $defaulter) {
            $result = $smsService->sendDefaulterReminder($defaulter);
            if ($result['success']) {
                $defaulter->update([
                    'last_reminder_sent' => now(),
                    'reminder_count' => $defaulter->reminder_count + 1,
                ]);
                $sent++;
            } else {
                $failed++;
            }
        }

        return response()->json([
            'message' => "Sent {$sent} reminders, {$failed} failed",
            'sent' => $sent,
            'failed' => $failed,
        ]);
    }
}
