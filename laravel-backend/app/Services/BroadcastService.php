<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class BroadcastService
{
    protected ?string $pusherKey;
    protected ?string $pusherSecret;
    protected ?string $pusherAppId;
    protected ?string $pusherCluster;
    protected bool $usePusher;

    public function __construct()
    {
        $this->pusherKey = config('broadcasting.connections.pusher.key');
        $this->pusherSecret = config('broadcasting.connections.pusher.secret');
        $this->pusherAppId = config('broadcasting.connections.pusher.app_id');
        $this->pusherCluster = config('broadcasting.connections.pusher.options.cluster', 'eu');
        $this->usePusher = !empty($this->pusherKey) && !empty($this->pusherSecret);
    }

    /**
     * Broadcast a backup progress update
     */
    public function backupProgress(string $backupId, array $data): void
    {
        $payload = [
            'type' => 'backup_progress',
            'backup_id' => $backupId,
            'progress' => $data['progress'] ?? 0,
            'status' => $data['status'] ?? 'in_progress',
            'message' => $data['message'] ?? '',
            'step' => $data['step'] ?? '',
            'timestamp' => now()->toISOString(),
        ];

        $this->broadcast('platform-backups', 'backup.progress', $payload);
        $this->storeProgress('backup', $backupId, $payload);
    }

    /**
     * Broadcast a restore progress update
     */
    public function restoreProgress(string $restoreId, array $data): void
    {
        $payload = [
            'type' => 'restore_progress',
            'restore_id' => $restoreId,
            'progress' => $data['progress'] ?? 0,
            'status' => $data['status'] ?? 'in_progress',
            'message' => $data['message'] ?? '',
            'step' => $data['step'] ?? '',
            'timestamp' => now()->toISOString(),
        ];

        $this->broadcast('platform-restores', 'restore.progress', $payload);
        $this->storeProgress('restore', $restoreId, $payload);
    }

    /**
     * Broadcast SMS send progress
     */
    public function smsProgress(string $batchId, array $data): void
    {
        $tenantSlug = session('tenant_slug', 'default');
        
        $payload = [
            'type' => 'sms_progress',
            'batch_id' => $batchId,
            'sent' => $data['sent'] ?? 0,
            'failed' => $data['failed'] ?? 0,
            'total' => $data['total'] ?? 0,
            'status' => $data['status'] ?? 'in_progress',
            'message' => $data['message'] ?? '',
            'timestamp' => now()->toISOString(),
        ];

        $this->broadcast("tenant-{$tenantSlug}-sms", 'sms.progress', $payload);
        $this->storeProgress('sms', $batchId, $payload);
    }

    /**
     * Broadcast payment notification
     */
    public function paymentReceived(string $tenantSlug, array $data): void
    {
        $payload = [
            'type' => 'payment_received',
            'invoice_id' => $data['invoice_id'] ?? null,
            'business_name' => $data['business_name'] ?? '',
            'amount' => $data['amount'] ?? 0,
            'payment_method' => $data['payment_method'] ?? '',
            'timestamp' => now()->toISOString(),
        ];

        $this->broadcast("tenant-{$tenantSlug}-payments", 'payment.received', $payload);
    }

    /**
     * Broadcast invoice status update
     */
    public function invoiceStatusChanged(string $tenantSlug, array $data): void
    {
        $payload = [
            'type' => 'invoice_status_changed',
            'invoice_id' => $data['invoice_id'] ?? null,
            'status' => $data['status'] ?? '',
            'business_id' => $data['business_id'] ?? null,
            'timestamp' => now()->toISOString(),
        ];

        $this->broadcast("tenant-{$tenantSlug}-invoices", 'invoice.status', $payload);
    }

    /**
     * Broadcast general notification
     */
    public function notification(string $channel, string $title, string $message, string $type = 'info'): void
    {
        $payload = [
            'type' => 'notification',
            'title' => $title,
            'message' => $message,
            'notification_type' => $type, // info, success, warning, error
            'timestamp' => now()->toISOString(),
        ];

        $this->broadcast($channel, 'notification', $payload);
    }

    /**
     * Broadcast tenant-specific notification
     */
    public function tenantNotification(string $tenantSlug, string $title, string $message, string $type = 'info'): void
    {
        $this->notification("tenant-{$tenantSlug}-notifications", $title, $message, $type);
    }

    /**
     * Store progress in cache for polling fallback
     */
    protected function storeProgress(string $type, string $id, array $data): void
    {
        $key = "progress:{$type}:{$id}";
        Cache::put($key, $data, now()->addMinutes(30));
    }

    /**
     * Get stored progress (for polling fallback)
     */
    public function getProgress(string $type, string $id): ?array
    {
        $key = "progress:{$type}:{$id}";
        return Cache::get($key);
    }

    /**
     * Broadcast to a channel - uses Pusher if configured, otherwise stores for polling
     */
    protected function broadcast(string $channel, string $event, array $payload): void
    {
        try {
            // Store in database for polling fallback
            $this->storeMessage($channel, $event, $payload);

            // If Pusher is configured, send real-time
            if ($this->usePusher) {
                $this->sendToPusher($channel, $event, $payload);
            }
        } catch (\Exception $e) {
            Log::warning('Broadcast failed: ' . $e->getMessage());
        }
    }

    /**
     * Send event to Pusher
     */
    protected function sendToPusher(string $channel, string $event, array $payload): void
    {
        $body = json_encode([
            'name' => $event,
            'channel' => $channel,
            'data' => json_encode($payload),
        ]);

        $authTimestamp = time();
        $authVersion = '1.0';
        $bodyMd5 = md5($body);

        $stringToSign = "POST\n/apps/{$this->pusherAppId}/events\n" .
            "auth_key={$this->pusherKey}&" .
            "auth_timestamp={$authTimestamp}&" .
            "auth_version={$authVersion}&" .
            "body_md5={$bodyMd5}";

        $authSignature = hash_hmac('sha256', $stringToSign, $this->pusherSecret);

        $url = "https://api-{$this->pusherCluster}.pusher.com/apps/{$this->pusherAppId}/events?" .
            "auth_key={$this->pusherKey}&" .
            "auth_timestamp={$authTimestamp}&" .
            "auth_version={$authVersion}&" .
            "body_md5={$bodyMd5}&" .
            "auth_signature={$authSignature}";

        Http::withHeaders([
            'Content-Type' => 'application/json',
        ])->timeout(5)->post($url, [
            'name' => $event,
            'channel' => $channel,
            'data' => json_encode($payload),
        ]);
    }

    /**
     * Store message in database for polling
     */
    protected function storeMessage(string $channel, string $event, array $payload): void
    {
        try {
            DB::table('broadcast_messages')->insert([
                'channel' => $channel,
                'event' => $event,
                'payload' => json_encode($payload),
                'created_at' => now(),
            ]);

            // Clean up old messages
            $this->cleanupOldMessages($channel);
        } catch (\Exception $e) {
            // Silent fail
        }
    }

    /**
     * Cleanup old broadcast messages
     */
    protected function cleanupOldMessages(string $channel): void
    {
        try {
            $keepCount = 100;
            $count = DB::table('broadcast_messages')
                ->where('channel', $channel)
                ->count();

            if ($count > $keepCount) {
                $idsToDelete = DB::table('broadcast_messages')
                    ->where('channel', $channel)
                    ->orderBy('created_at', 'asc')
                    ->limit($count - $keepCount)
                    ->pluck('id');

                DB::table('broadcast_messages')
                    ->whereIn('id', $idsToDelete)
                    ->delete();
            }
        } catch (\Exception $e) {
            // Silent fail
        }
    }

    /**
     * Get recent messages for a channel (polling fallback)
     */
    public function getRecentMessages(string $channel, ?string $since = null): array
    {
        $query = DB::table('broadcast_messages')
            ->where('channel', $channel)
            ->orderBy('created_at', 'desc')
            ->limit(50);

        if ($since) {
            $query->where('created_at', '>', $since);
        }

        return $query->get()->map(function ($msg) {
            return [
                'id' => $msg->id,
                'event' => $msg->event ?? 'message',
                'payload' => json_decode($msg->payload, true),
                'created_at' => $msg->created_at,
            ];
        })->toArray();
    }

    /**
     * Authenticate a private/presence channel (for Pusher)
     */
    public function authenticateChannel(string $channelName, string $socketId): array
    {
        if (!$this->usePusher) {
            return ['error' => 'Pusher not configured'];
        }

        $stringToSign = "{$socketId}:{$channelName}";
        $signature = hash_hmac('sha256', $stringToSign, $this->pusherSecret);

        return [
            'auth' => "{$this->pusherKey}:{$signature}",
        ];
    }
}
