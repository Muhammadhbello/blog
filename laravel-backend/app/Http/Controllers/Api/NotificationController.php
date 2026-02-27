<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\EmailService;
use App\Services\BroadcastService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class NotificationController extends Controller
{
    protected EmailService $emailService;
    protected BroadcastService $broadcastService;

    public function __construct(EmailService $emailService, BroadcastService $broadcastService)
    {
        $this->emailService = $emailService;
        $this->broadcastService = $broadcastService;
    }

    // ==========================================
    // REAL-TIME NOTIFICATIONS (POLLING)
    // ==========================================

    /**
     * Poll for real-time updates (fallback for WebSocket)
     */
    public function poll(Request $request)
    {
        $channel = $request->get('channel', 'platform.notifications');
        $since = $request->get('since');
        
        $messages = $this->broadcastService->getRecentMessages($channel, $since);
        
        return response()->json([
            'messages' => $messages,
            'timestamp' => now()->toISOString(),
        ]);
    }

    /**
     * Get backup progress
     */
    public function getBackupProgress(string $backupId)
    {
        $progress = $this->broadcastService->getProgress('backup', $backupId);
        
        if (!$progress) {
            // Check database for backup status
            $backup = DB::table('backup_records')->where('id', $backupId)->first();
            if ($backup) {
                $progress = [
                    'type' => 'backup_progress',
                    'backup_id' => $backupId,
                    'progress' => $backup->status === 'completed' ? 100 : ($backup->status === 'failed' ? 0 : 50),
                    'status' => $backup->status,
                    'message' => $backup->message ?? '',
                ];
            }
        }
        
        return response()->json($progress ?? ['status' => 'not_found']);
    }

    /**
     * Get restore progress
     */
    public function getRestoreProgress(string $restoreId)
    {
        $progress = $this->broadcastService->getProgress('restore', $restoreId);
        
        if (!$progress) {
            $restore = DB::table('restore_records')->where('id', $restoreId)->first();
            if ($restore) {
                $progress = [
                    'type' => 'restore_progress',
                    'restore_id' => $restoreId,
                    'progress' => $restore->status === 'completed' ? 100 : ($restore->status === 'failed' ? 0 : 50),
                    'status' => $restore->status,
                    'message' => $restore->message ?? '',
                ];
            }
        }
        
        return response()->json($progress ?? ['status' => 'not_found']);
    }

    /**
     * Get SMS batch progress
     */
    public function getSmsProgress(string $batchId)
    {
        $progress = $this->broadcastService->getProgress('sms', $batchId);
        
        return response()->json($progress ?? ['status' => 'not_found']);
    }

    /**
     * Subscribe to channel (returns initial state)
     */
    public function subscribe(Request $request)
    {
        $channels = $request->get('channels', []);
        $initialData = [];

        foreach ($channels as $channel) {
            $initialData[$channel] = $this->broadcastService->getRecentMessages($channel, null);
        }

        return response()->json([
            'subscribed' => $channels,
            'initial_data' => $initialData,
            'timestamp' => now()->toISOString(),
        ]);
    }

    /**
     * Pusher authentication endpoint for private/presence channels
     */
    public function pusherAuth(Request $request)
    {
        $socketId = $request->input('socket_id');
        $channelName = $request->input('channel_name');

        if (!$socketId || !$channelName) {
            return response()->json(['error' => 'Missing parameters'], 400);
        }

        // Verify user is authenticated
        if (!auth()->check()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // For private channels, verify access based on channel name
        if (str_starts_with($channelName, 'private-tenant-')) {
            // Extract tenant slug from channel
            preg_match('/private-tenant-([a-z0-9-]+)/', $channelName, $matches);
            $tenantSlug = $matches[1] ?? '';
            
            // Verify user belongs to this tenant or is platform admin
            $user = auth()->user();
            if ($user->tenant && $user->tenant->slug !== $tenantSlug && !$user->isPlatformAdmin()) {
                return response()->json(['error' => 'Access denied to this channel'], 403);
            }
        }

        $auth = $this->broadcastService->authenticateChannel($channelName, $socketId);

        if (isset($auth['error'])) {
            return response()->json($auth, 500);
        }

        return response()->json($auth);
    }

    /**
     * Get Pusher configuration for frontend
     */
    public function getPusherConfig()
    {
        return response()->json([
            'key' => config('broadcasting.connections.pusher.key'),
            'cluster' => config('broadcasting.connections.pusher.options.cluster'),
            'encrypted' => true,
            'auth_endpoint' => '/api/realtime/pusher/auth',
        ]);
    }

    /**
     * Get email settings
     */
    public function getEmailSettings()
    {
        $settings = DB::connection('tenant')
            ->table('email_settings')
            ->first();

        if (!$settings) {
            return response()->json([
                'provider' => 'smtp',
                'from_email' => '',
                'from_name' => '',
                'smtp_host' => '',
                'smtp_port' => 587,
                'smtp_username' => '',
                'smtp_encryption' => 'tls',
                'is_active' => false,
            ]);
        }

        // Hide sensitive data
        $settings = (array) $settings;
        unset($settings['smtp_password']);
        
        return response()->json($settings);
    }

    /**
     * Save email settings
     */
    public function saveEmailSettings(Request $request)
    {
        $validated = $request->validate([
            'provider' => 'required|in:smtp,sendgrid,mailgun',
            'from_email' => 'required|email',
            'from_name' => 'required|string|max:255',
            'smtp_host' => 'required_if:provider,smtp|nullable|string',
            'smtp_port' => 'required_if:provider,smtp|nullable|integer',
            'smtp_username' => 'nullable|string',
            'smtp_password' => 'nullable|string',
            'smtp_encryption' => 'nullable|in:tls,ssl,none',
            'api_key' => 'required_if:provider,sendgrid,mailgun|nullable|string',
            'is_active' => 'boolean',
        ]);

        $existing = DB::connection('tenant')
            ->table('email_settings')
            ->first();

        $data = [
            'provider' => $validated['provider'],
            'from_email' => $validated['from_email'],
            'from_name' => $validated['from_name'],
            'smtp_host' => $validated['smtp_host'] ?? null,
            'smtp_port' => $validated['smtp_port'] ?? 587,
            'smtp_username' => $validated['smtp_username'] ?? null,
            'smtp_encryption' => $validated['smtp_encryption'] ?? 'tls',
            'api_key' => $validated['api_key'] ?? null,
            'is_active' => $validated['is_active'] ?? false,
            'updated_at' => now(),
        ];

        // Only update password if provided
        if (!empty($validated['smtp_password'])) {
            $data['smtp_password'] = encrypt($validated['smtp_password']);
        }

        if ($existing) {
            DB::connection('tenant')
                ->table('email_settings')
                ->where('id', $existing->id)
                ->update($data);
        } else {
            $data['created_at'] = now();
            DB::connection('tenant')
                ->table('email_settings')
                ->insert($data);
        }

        return response()->json(['message' => 'Email settings saved successfully']);
    }

    /**
     * Test email settings
     */
    public function testEmail(Request $request)
    {
        $validated = $request->validate([
            'test_email' => 'required|email',
        ]);

        $result = $this->emailService->send(
            $validated['test_email'],
            'FlexCloud Test Email',
            '<h2>Test Email</h2><p>This is a test email from FlexCloud Revenue Management System.</p><p>If you received this email, your email configuration is working correctly!</p>'
        );

        return response()->json($result);
    }

    /**
     * Get email templates
     */
    public function getTemplates()
    {
        $templates = DB::connection('tenant')
            ->table('notification_templates')
            ->whereNotNull('email_template')
            ->orWhereNotNull('email_subject')
            ->orderBy('type')
            ->get();

        return response()->json($templates);
    }

    /**
     * Update email template
     */
    public function updateTemplate(Request $request, int $id)
    {
        $validated = $request->validate([
            'email_subject' => 'nullable|string|max:255',
            'email_template' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        DB::connection('tenant')
            ->table('notification_templates')
            ->where('id', $id)
            ->update([
                'email_subject' => $validated['email_subject'],
                'email_template' => $validated['email_template'],
                'is_active' => $validated['is_active'] ?? true,
                'updated_at' => now(),
            ]);

        return response()->json(['message' => 'Template updated successfully']);
    }

    /**
     * Get email logs
     */
    public function getLogs(Request $request)
    {
        $query = DB::connection('tenant')
            ->table('email_logs')
            ->orderBy('created_at', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('recipient')) {
            $query->where('recipient', 'like', '%' . $request->recipient . '%');
        }

        $logs = $query->paginate(50);

        return response()->json($logs);
    }

    /**
     * Get email stats
     */
    public function getStats()
    {
        $stats = $this->emailService->getStats();

        // Get daily stats for last 7 days
        $dailyStats = DB::connection('tenant')
            ->table('email_logs')
            ->selectRaw('DATE(created_at) as date, status, COUNT(*) as count')
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy('date', 'status')
            ->orderBy('date')
            ->get();

        return response()->json([
            'totals' => $stats,
            'daily' => $dailyStats,
        ]);
    }

    /**
     * Send manual email to businesses
     */
    public function sendBulkEmail(Request $request)
    {
        $validated = $request->validate([
            'business_ids' => 'required|array|min:1',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        $businesses = DB::connection('tenant')
            ->table('businesses')
            ->whereIn('id', $validated['business_ids'])
            ->whereNotNull('owner_email')
            ->get();

        $results = ['success' => 0, 'failed' => 0, 'skipped' => 0];

        foreach ($businesses as $business) {
            if (empty($business->owner_email)) {
                $results['skipped']++;
                continue;
            }

            $result = $this->emailService->send(
                $business->owner_email,
                $validated['subject'],
                str_replace(
                    ['{{business_name}}', '{{owner_name}}'],
                    [$business->business_name, $business->owner_name],
                    $validated['message']
                )
            );

            if ($result['success']) {
                $results['success']++;
            } else {
                $results['failed']++;
            }
        }

        return response()->json([
            'message' => 'Bulk email completed',
            'results' => $results,
        ]);
    }

    /**
     * Resend failed email
     */
    public function resendEmail(int $id)
    {
        $log = DB::connection('tenant')
            ->table('email_logs')
            ->where('id', $id)
            ->first();

        if (!$log) {
            return response()->json(['message' => 'Email log not found'], 404);
        }

        $data = json_decode($log->data, true) ?? [];
        $result = $this->emailService->send($log->recipient, $log->subject, $data['body'] ?? '');

        return response()->json($result);
    }
}
