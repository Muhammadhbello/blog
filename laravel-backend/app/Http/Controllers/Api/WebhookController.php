<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\VirtualAccountService;

class WebhookController extends Controller
{
    public function __construct(protected VirtualAccountService $virtualAccountService)
    {
    }

    public function handlePaymentWebhook(Request $request)
    {
        $payload = $request->all();

        \Log::info('Payment webhook received', ['payload' => $payload]);

        try {
            $this->virtualAccountService->handleWebhook($payload);

            return response()->json(['status' => 'success'], 200);
        } catch (\Exception $e) {
            \Log::error('Webhook processing failed', ['error' => $e->getMessage()]);
            return response()->json(['status' => 'error'], 500);
        }
    }
}
