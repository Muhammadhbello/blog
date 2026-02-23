<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OfflineSyncController extends Controller
{
    /**
     * Receive offline ticket sales data and queue for processing
     */
    public function syncTickets(Request $request)
    {
        $validated = $request->validate([
            'device_id' => 'required|string',
            'tickets' => 'required|array',
            'tickets.*.ticket_id' => 'required|integer',
            'tickets.*.sold_at' => 'required|date',
            'tickets.*.payment_method' => 'required|string',
            'tickets.*.payer_name' => 'nullable|string',
            'tickets.*.payer_phone' => 'nullable|string',
            'tickets.*.offline_reference' => 'required|string',
        ]);

        $results = [
            'success' => [],
            'failed' => [],
            'duplicates' => [],
        ];

        $userId = auth()->id();

        foreach ($validated['tickets'] as $ticketData) {
            // Check for duplicate offline reference
            $existing = DB::connection('tenant')
                ->table('offline_sync_log')
                ->where('offline_reference', $ticketData['offline_reference'])
                ->first();

            if ($existing) {
                $results['duplicates'][] = [
                    'offline_reference' => $ticketData['offline_reference'],
                    'message' => 'Already synced',
                ];
                continue;
            }

            // Verify ticket exists and is available
            $ticket = DB::connection('tenant')
                ->table('tickets')
                ->where('id', $ticketData['ticket_id'])
                ->first();

            if (!$ticket) {
                $results['failed'][] = [
                    'offline_reference' => $ticketData['offline_reference'],
                    'message' => 'Ticket not found',
                ];
                continue;
            }

            if ($ticket->status !== 'available') {
                $results['failed'][] = [
                    'offline_reference' => $ticketData['offline_reference'],
                    'message' => 'Ticket already sold or cancelled',
                ];
                continue;
            }

            try {
                DB::connection('tenant')->beginTransaction();

                // Update ticket as sold
                DB::connection('tenant')
                    ->table('tickets')
                    ->where('id', $ticketData['ticket_id'])
                    ->update([
                        'status' => 'sold',
                        'sold_at' => $ticketData['sold_at'],
                        'sold_by' => $userId,
                        'valid_until' => now()->addDays(1),
                        'updated_at' => now(),
                    ]);

                // Create payment record
                DB::connection('tenant')
                    ->table('ticket_payments')
                    ->insert([
                        'ticket_id' => $ticketData['ticket_id'],
                        'amount' => $ticket->amount,
                        'payment_method' => $ticketData['payment_method'],
                        'payer_name' => $ticketData['payer_name'],
                        'payer_phone' => $ticketData['payer_phone'],
                        'collected_by' => $userId,
                        'offline_reference' => $ticketData['offline_reference'],
                        'synced_at' => now(),
                        'created_at' => $ticketData['sold_at'],
                        'updated_at' => now(),
                    ]);

                // Update batch counters
                DB::connection('tenant')
                    ->table('ticket_batches')
                    ->where('id', $ticket->batch_id)
                    ->increment('tickets_sold');

                DB::connection('tenant')
                    ->table('ticket_batches')
                    ->where('id', $ticket->batch_id)
                    ->increment('amount_collected', $ticket->amount);

                // Log sync
                DB::connection('tenant')
                    ->table('offline_sync_log')
                    ->insert([
                        'device_id' => $validated['device_id'],
                        'sync_type' => 'ticket_sale',
                        'entity_type' => 'ticket',
                        'entity_id' => $ticketData['ticket_id'],
                        'offline_reference' => $ticketData['offline_reference'],
                        'offline_timestamp' => $ticketData['sold_at'],
                        'synced_by' => $userId,
                        'synced_at' => now(),
                        'data' => json_encode($ticketData),
                        'created_at' => now(),
                    ]);

                DB::connection('tenant')->commit();

                $results['success'][] = [
                    'offline_reference' => $ticketData['offline_reference'],
                    'ticket_id' => $ticketData['ticket_id'],
                    'ticket_number' => $ticket->ticket_number,
                ];

            } catch (\Exception $e) {
                DB::connection('tenant')->rollBack();
                $results['failed'][] = [
                    'offline_reference' => $ticketData['offline_reference'],
                    'message' => 'Sync failed: ' . $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'message' => 'Sync completed',
            'summary' => [
                'total' => count($validated['tickets']),
                'success' => count($results['success']),
                'failed' => count($results['failed']),
                'duplicates' => count($results['duplicates']),
            ],
            'results' => $results,
        ]);
    }

    /**
     * Get tickets available for offline use
     */
    public function getOfflineTickets(Request $request)
    {
        $userId = auth()->id();

        // Get batches assigned to this user
        $batches = DB::connection('tenant')
            ->table('ticket_batches')
            ->where('assigned_to', $userId)
            ->whereIn('status', ['assigned', 'in_use'])
            ->get();

        $offlineData = [];

        foreach ($batches as $batch) {
            $tickets = DB::connection('tenant')
                ->table('tickets')
                ->where('batch_id', $batch->id)
                ->where('status', 'available')
                ->select('id', 'ticket_number', 'amount', 'batch_id')
                ->get();

            $revenuePoint = DB::connection('tenant')
                ->table('revenue_points')
                ->where('id', $batch->revenue_point_id)
                ->first();

            $offlineData[] = [
                'batch' => [
                    'id' => $batch->id,
                    'batch_number' => $batch->batch_number,
                    'unit_price' => $batch->unit_price,
                    'validity_days' => $batch->validity_days,
                ],
                'revenue_point' => [
                    'id' => $revenuePoint->id ?? null,
                    'name' => $revenuePoint->name ?? 'Unknown',
                    'code' => $revenuePoint->code ?? '',
                ],
                'tickets' => $tickets,
            ];
        }

        return response()->json([
            'device_id' => $request->header('X-Device-ID', Str::uuid()),
            'synced_at' => now()->toISOString(),
            'data' => $offlineData,
            'total_tickets' => collect($offlineData)->sum(fn($d) => count($d['tickets'])),
        ]);
    }

    /**
     * Get sync status and history
     */
    public function getSyncHistory(Request $request)
    {
        $userId = auth()->id();
        $deviceId = $request->get('device_id');

        $query = DB::connection('tenant')
            ->table('offline_sync_log')
            ->where('synced_by', $userId);

        if ($deviceId) {
            $query->where('device_id', $deviceId);
        }

        $history = $query->orderBy('synced_at', 'desc')
            ->limit(100)
            ->get();

        $stats = DB::connection('tenant')
            ->table('offline_sync_log')
            ->where('synced_by', $userId)
            ->selectRaw('DATE(synced_at) as date, COUNT(*) as count, sync_type')
            ->groupBy('date', 'sync_type')
            ->orderBy('date', 'desc')
            ->limit(30)
            ->get();

        return response()->json([
            'history' => $history,
            'stats' => $stats,
        ]);
    }

    /**
     * Register device for offline use
     */
    public function registerDevice(Request $request)
    {
        $validated = $request->validate([
            'device_name' => 'required|string|max:255',
            'device_type' => 'required|in:android,ios,windows,pos',
            'device_info' => 'nullable|array',
        ]);

        $deviceId = Str::uuid()->toString();

        DB::connection('tenant')
            ->table('registered_devices')
            ->insert([
                'device_id' => $deviceId,
                'device_name' => $validated['device_name'],
                'device_type' => $validated['device_type'],
                'device_info' => json_encode($validated['device_info'] ?? []),
                'user_id' => auth()->id(),
                'is_active' => true,
                'registered_at' => now(),
                'last_sync_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json([
            'device_id' => $deviceId,
            'message' => 'Device registered successfully',
        ], 201);
    }
}
