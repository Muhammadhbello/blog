<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\TicketBatch;
use App\Models\Ticket;
use App\Models\RevenueItem;
use Illuminate\Support\Str;

class TicketController extends Controller
{
    public function createBatch(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
            'revenue_item_id' => 'required|exists:revenue_items,id',
            'quantity' => 'required|integer|min:1|max:10000',
        ]);

        // Get the last serial number
        $lastBatch = TicketBatch::where('tenant_id', $validated['tenant_id'])
            ->orderBy('end_serial', 'desc')
            ->first();

        $startSerial = $lastBatch ? $lastBatch->end_serial + 1 : 1;
        $endSerial = $startSerial + $validated['quantity'] - 1;

        $batch = TicketBatch::create([
            'tenant_id' => $validated['tenant_id'],
            'revenue_item_id' => $validated['revenue_item_id'],
            'batch_number' => 'BATCH-' . strtoupper(Str::random(8)),
            'start_serial' => $startSerial,
            'end_serial' => $endSerial,
            'total_tickets' => $validated['quantity'],
            'status' => 'active',
        ]);

        // Create individual tickets
        $tickets = [];
        for ($i = $startSerial; $i <= $endSerial; $i++) {
            $serialNumber = str_pad($i, 8, '0', STR_PAD_LEFT);
            $qrData = json_encode([
                'serial' => $serialNumber,
                'batch' => $batch->batch_number,
                'tenant' => $validated['tenant_id'],
            ]);

            $tickets[] = [
                'tenant_id' => $validated['tenant_id'],
                'batch_id' => $batch->id,
                'serial_number' => $serialNumber,
                'qr_code' => base64_encode($qrData),
                'status' => 'available',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        Ticket::insert($tickets);

        return response()->json([
            'batch' => $batch,
            'message' => "Created {$validated['quantity']} tickets successfully",
        ], 201);
    }

    public function getBatches(Request $request)
    {
        $query = TicketBatch::with(['revenueItem'])
            ->where('tenant_id', auth()->user()->tenant_id);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $batches = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($batches);
    }

    public function getTickets(Request $request)
    {
        $query = Ticket::where('tenant_id', auth()->user()->tenant_id);

        if ($request->has('batch_id')) {
            $query->where('batch_id', $request->batch_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $tickets = $query->orderBy('serial_number')->paginate(50);

        return response()->json($tickets);
    }

    public function sellTicket(Request $request)
    {
        $validated = $request->validate([
            'serial_number' => 'required|string',
        ]);

        $ticket = Ticket::where('serial_number', $validated['serial_number'])
            ->where('tenant_id', auth()->user()->tenant_id)
            ->where('status', 'available')
            ->first();

        if (!$ticket) {
            return response()->json(['message' => 'Ticket not available'], 404);
        }

        $ticket->update([
            'status' => 'sold',
            'sold_by' => auth()->id(),
            'sold_at' => now(),
        ]);

        return response()->json([
            'ticket' => $ticket,
            'message' => 'Ticket sold successfully',
        ]);
    }

    public function verifyTicket(Request $request)
    {
        $validated = $request->validate([
            'serial_number' => 'required|string',
        ]);

        $ticket = Ticket::where('serial_number', $validated['serial_number'])
            ->where('tenant_id', auth()->user()->tenant_id)
            ->with(['batch.revenueItem'])
            ->first();

        if (!$ticket) {
            return response()->json(['message' => 'Ticket not found', 'valid' => false], 404);
        }

        if ($ticket->status === 'verified') {
            return response()->json([
                'message' => 'Ticket already verified',
                'valid' => false,
                'ticket' => $ticket,
            ]);
        }

        if ($ticket->status !== 'sold') {
            return response()->json([
                'message' => 'Ticket not yet sold',
                'valid' => false,
                'ticket' => $ticket,
            ]);
        }

        $ticket->update([
            'status' => 'verified',
            'verified_at' => now(),
        ]);

        return response()->json([
            'message' => 'Ticket verified successfully',
            'valid' => true,
            'ticket' => $ticket,
        ]);
    }
}
