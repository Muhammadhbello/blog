<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Defaulter;
use App\Models\Invoice;
use App\Models\Business;
use App\Services\SMSService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DefaulterController extends Controller
{
    protected SMSService $smsService;

    public function __construct(SMSService $smsService)
    {
        $this->smsService = $smsService;
    }

    /**
     * Detect and create defaulter records from overdue invoices
     */
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

    /**
     * Get all defaulters with pagination and advanced filtering
     */
    public function getDefaulters(Request $request)
    {
        $query = Defaulter::with(['business', 'business.ward'])
            ->where('tenant_id', auth()->user()->tenant_id);

        // Filters
        if ($request->has('min_days')) {
            $query->where('days_overdue', '>=', $request->min_days);
        }

        if ($request->has('max_days')) {
            $query->where('days_overdue', '<=', $request->max_days);
        }

        if ($request->has('min_amount')) {
            $query->where('amount_due', '>=', $request->min_amount);
        }

        if ($request->has('max_amount')) {
            $query->where('amount_due', '<=', $request->max_amount);
        }

        if ($request->has('ward_id')) {
            $query->whereHas('business', function ($q) use ($request) {
                $q->where('ward_id', $request->ward_id);
            });
        }

        if ($request->has('business_size')) {
            $query->whereHas('business', function ($q) use ($request) {
                $q->where('size', $request->business_size);
            });
        }

        if ($request->has('reminder_count')) {
            $query->where('reminder_count', '<=', $request->reminder_count);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('business', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('owner_name', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'amount_due');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        if ($request->has('per_page')) {
            $defaulters = $query->paginate($request->per_page);
        } else {
            $defaulters = $query->get();
        }

        return response()->json($defaulters);
    }

    /**
     * Get defaulter statistics
     */
    public function getStats(Request $request)
    {
        $tenantId = auth()->user()->tenant_id;

        $stats = [
            'total_defaulters' => Defaulter::where('tenant_id', $tenantId)
                ->where('status', '!=', 'cleared')
                ->count(),

            'total_outstanding' => Defaulter::where('tenant_id', $tenantId)
                ->where('status', '!=', 'cleared')
                ->sum('amount_due'),

            'by_days_overdue' => [
                '1_30' => Defaulter::where('tenant_id', $tenantId)
                    ->where('status', '!=', 'cleared')
                    ->whereBetween('days_overdue', [1, 30])
                    ->count(),
                '31_60' => Defaulter::where('tenant_id', $tenantId)
                    ->where('status', '!=', 'cleared')
                    ->whereBetween('days_overdue', [31, 60])
                    ->count(),
                '61_90' => Defaulter::where('tenant_id', $tenantId)
                    ->where('status', '!=', 'cleared')
                    ->whereBetween('days_overdue', [61, 90])
                    ->count(),
                'over_90' => Defaulter::where('tenant_id', $tenantId)
                    ->where('status', '!=', 'cleared')
                    ->where('days_overdue', '>', 90)
                    ->count(),
            ],

            'by_size' => Defaulter::where('tenant_id', $tenantId)
                ->where('status', '!=', 'cleared')
                ->join('businesses', 'defaulters.business_id', '=', 'businesses.id')
                ->select(
                    'businesses.size',
                    DB::raw('COUNT(*) as count'),
                    DB::raw('SUM(defaulters.amount_due) as total')
                )
                ->groupBy('businesses.size')
                ->get(),

            'by_ward' => Defaulter::where('defaulters.tenant_id', $tenantId)
                ->where('defaulters.status', '!=', 'cleared')
                ->join('businesses', 'defaulters.business_id', '=', 'businesses.id')
                ->join('wards', 'businesses.ward_id', '=', 'wards.id')
                ->select(
                    'wards.id',
                    'wards.name',
                    DB::raw('COUNT(*) as count'),
                    DB::raw('SUM(defaulters.amount_due) as total')
                )
                ->groupBy('wards.id', 'wards.name')
                ->orderByDesc('total')
                ->limit(10)
                ->get(),

            'never_reminded' => Defaulter::where('tenant_id', $tenantId)
                ->where('status', '!=', 'cleared')
                ->where('reminder_count', 0)
                ->count(),

            'recently_reminded' => Defaulter::where('tenant_id', $tenantId)
                ->where('status', '!=', 'cleared')
                ->whereNotNull('last_reminder_sent')
                ->where('last_reminder_sent', '>=', now()->subDays(7))
                ->count(),
        ];

        // Get SMS balance if configured
        try {
            $smsBalance = $this->smsService->getBalance();
            $stats['sms_balance'] = $smsBalance;
        } catch (\Exception $e) {
            $stats['sms_balance'] = ['success' => false, 'message' => 'Unable to fetch'];
        }

        return response()->json($stats);
    }

    /**
     * Send reminder to single defaulter
     */
    public function sendReminder(Request $request, Defaulter $defaulter)
    {
        if ($defaulter->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $customMessage = $request->input('message');
        $result = $this->smsService->sendDefaulterReminder($defaulter, $customMessage);

        if ($result['success']) {
            $defaulter->update([
                'last_reminder_sent' => now(),
                'reminder_count' => $defaulter->reminder_count + 1,
            ]);

            return response()->json([
                'message' => 'Reminder sent successfully',
                'defaulter' => $defaulter->fresh(['business']),
            ]);
        }

        return response()->json([
            'message' => 'Failed to send reminder',
            'error' => $result['error'] ?? 'Unknown error',
        ], 500);
    }

    /**
     * Send bulk SMS reminders to selected defaulters
     */
    public function sendBulkReminders(Request $request)
    {
        $validated = $request->validate([
            'defaulter_ids' => 'required|array|min:1|max:500',
            'defaulter_ids.*' => 'integer',
            'message' => 'nullable|string|max:500',
        ]);

        $tenantId = auth()->user()->tenant_id;
        
        $defaulters = Defaulter::where('tenant_id', $tenantId)
            ->whereIn('id', $validated['defaulter_ids'])
            ->with('business')
            ->get();

        if ($defaulters->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No valid defaulters found',
            ], 404);
        }

        $sent = 0;
        $failed = 0;
        $errors = [];

        foreach ($defaulters as $defaulter) {
            $phone = $defaulter->business->owner_phone ?? $defaulter->business->phone;
            
            if (!$phone) {
                $failed++;
                $errors[] = [
                    'id' => $defaulter->id,
                    'business' => $defaulter->business->name,
                    'error' => 'No phone number',
                ];
                continue;
            }

            $result = $this->smsService->sendDefaulterReminder($defaulter, $validated['message'] ?? null);
            
            if ($result['success']) {
                $defaulter->update([
                    'last_reminder_sent' => now(),
                    'reminder_count' => $defaulter->reminder_count + 1,
                ]);
                $sent++;
            } else {
                $failed++;
                $errors[] = [
                    'id' => $defaulter->id,
                    'business' => $defaulter->business->name,
                    'error' => $result['error'] ?? 'Send failed',
                ];
            }
        }

        // Log the bulk action
        $this->logBulkAction($request->user()->id, 'bulk_sms', $sent, $failed);

        return response()->json([
            'success' => $failed < count($defaulters),
            'message' => "Sent {$sent} reminders, {$failed} failed",
            'total' => count($defaulters),
            'sent' => $sent,
            'failed' => $failed,
            'errors' => array_slice($errors, 0, 10), // Limit errors shown
        ]);
    }

    /**
     * Send bulk SMS to all defaulters matching filters
     */
    public function sendBulkToFiltered(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:500',
            'min_days_overdue' => 'nullable|integer|min:1',
            'max_reminder_count' => 'nullable|integer|min:0',
            'min_amount' => 'nullable|numeric|min:0',
            'ward_id' => 'nullable|integer',
            'business_size' => 'nullable|string|in:small,medium,large',
        ]);

        $tenantId = auth()->user()->tenant_id;
        
        $query = Defaulter::where('tenant_id', $tenantId)
            ->where('status', '!=', 'cleared')
            ->with('business');

        if (!empty($validated['min_days_overdue'])) {
            $query->where('days_overdue', '>=', $validated['min_days_overdue']);
        }

        if (isset($validated['max_reminder_count'])) {
            $query->where('reminder_count', '<=', $validated['max_reminder_count']);
        }

        if (!empty($validated['min_amount'])) {
            $query->where('amount_due', '>=', $validated['min_amount']);
        }

        if (!empty($validated['ward_id'])) {
            $query->whereHas('business', function ($q) use ($validated) {
                $q->where('ward_id', $validated['ward_id']);
            });
        }

        if (!empty($validated['business_size'])) {
            $query->whereHas('business', function ($q) use ($validated) {
                $q->where('size', $validated['business_size']);
            });
        }

        $defaulters = $query->get();

        if ($defaulters->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No defaulters match the specified filters',
                'total' => 0,
            ]);
        }

        // Safety limit
        if ($defaulters->count() > 500) {
            return response()->json([
                'success' => false,
                'message' => "Too many recipients ({$defaulters->count()}). Maximum is 500. Please narrow your filters.",
                'total' => $defaulters->count(),
            ], 400);
        }

        $sent = 0;
        $failed = 0;

        foreach ($defaulters as $defaulter) {
            $phone = $defaulter->business->owner_phone ?? $defaulter->business->phone;
            
            if (!$phone) {
                $failed++;
                continue;
            }

            $result = $this->smsService->sendDefaulterReminder($defaulter, $validated['message']);
            
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

        $this->logBulkAction($request->user()->id, 'bulk_sms_filtered', $sent, $failed);

        return response()->json([
            'success' => $failed < $defaulters->count(),
            'message' => "Sent {$sent} reminders, {$failed} failed",
            'total' => $defaulters->count(),
            'sent' => $sent,
            'failed' => $failed,
        ]);
    }

    /**
     * Get SMS templates for defaulter reminders
     */
    public function getTemplates()
    {
        $templates = DB::connection('tenant')
            ->table('sms_templates')
            ->where('is_active', true)
            ->whereIn('type', ['defaulter_reminder', 'payment_reminder', 'final_notice', 'custom'])
            ->orderBy('type')
            ->get();

        // Add placeholders info
        $placeholders = [
            '{name}' => 'Business owner name',
            '{business_name}' => 'Business name',
            '{amount}' => 'Outstanding amount',
            '{invoice_number}' => 'Invoice number',
            '{due_date}' => 'Original due date',
            '{days_overdue}' => 'Days past due',
            '{tenant_name}' => 'LGA/Organization name',
        ];

        return response()->json([
            'templates' => $templates,
            'placeholders' => $placeholders,
        ]);
    }

    /**
     * Preview personalized message
     */
    public function previewMessage(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:500',
            'defaulter_id' => 'required|integer',
        ]);

        $defaulter = Defaulter::where('tenant_id', auth()->user()->tenant_id)
            ->where('id', $validated['defaulter_id'])
            ->with('business')
            ->first();

        if (!$defaulter) {
            return response()->json(['message' => 'Defaulter not found'], 404);
        }

        $placeholders = [
            '{name}' => $defaulter->business->owner_name ?? $defaulter->business->name,
            '{business_name}' => $defaulter->business->name,
            '{amount}' => number_format($defaulter->amount_due, 0),
            '{days_overdue}' => $defaulter->days_overdue,
            '{tenant_name}' => config('app.name', 'FlexCloud'),
        ];

        $preview = str_replace(array_keys($placeholders), array_values($placeholders), $validated['message']);

        return response()->json([
            'original' => $validated['message'],
            'preview' => $preview,
            'character_count' => strlen($preview),
            'sms_count' => ceil(strlen($preview) / 160),
            'recipient' => [
                'name' => $defaulter->business->name,
                'phone' => $defaulter->business->owner_phone ?? $defaulter->business->phone,
            ],
        ]);
    }

    /**
     * Update defaulter status
     */
    public function updateStatus(Request $request, int $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:active,payment_plan,legal,cleared',
            'notes' => 'nullable|string|max:500',
        ]);

        $defaulter = Defaulter::where('tenant_id', auth()->user()->tenant_id)
            ->where('id', $id)
            ->first();

        if (!$defaulter) {
            return response()->json(['message' => 'Defaulter not found'], 404);
        }

        $defaulter->update([
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? $defaulter->notes,
        ]);

        return response()->json([
            'message' => 'Status updated successfully',
            'defaulter' => $defaulter->fresh(['business']),
        ]);
    }

    /**
     * Log bulk SMS action
     */
    protected function logBulkAction(int $userId, string $action, int $sent, int $failed): void
    {
        try {
            DB::connection('tenant')->table('audit_logs')->insert([
                'user_id' => $userId,
                'action' => $action,
                'entity_type' => 'defaulter',
                'entity_id' => null,
                'old_value' => null,
                'new_value' => json_encode(['sent' => $sent, 'failed' => $failed]),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            // Silent fail for logging
        }
    }
}
