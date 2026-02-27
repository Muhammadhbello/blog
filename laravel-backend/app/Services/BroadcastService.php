<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class BroadcastService
{
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

        $this->broadcast('platform.backups', $payload);
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

        $this->broadcast('platform.restores', $payload);
        $this->storeProgress('restore', $restoreId, $payload);
    }

    /**
     * Broadcast SMS send progress
     */
    public function smsProgress(string $batchId, array $data): void
    {
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

        $this->broadcast('tenant.sms', $payload);
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

        $this->broadcast("tenant.{$tenantSlug}.payments", $payload);
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

        $this->broadcast($channel, $payload);
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
     * Broadcast to a channel
     * This method can be extended to use Pusher, Ably, or other WebSocket providers
     */
    protected function broadcast(string $channel, array $payload): void
    {
        try {
            // Store in database for polling fallback
            DB::table('broadcast_messages')->insert([
                'channel' => $channel,
                'payload' => json_encode($payload),
                'created_at' => now(),
            ]);

            // Clean up old messages (keep last 100 per channel)
            $this->cleanupOldMessages($channel);

            // If using Laravel Broadcasting with Pusher/Ably
            // event(new \App\Events\BroadcastEvent($channel, $payload));
            
        } catch (\Exception $e) {
            Log::warning('Broadcast failed: ' . $e->getMessage());
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
                'payload' => json_decode($msg->payload, true),
                'created_at' => $msg->created_at,
            ];
        })->toArray();
    }
}
