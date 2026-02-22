<?php

namespace App\Services;

use App\Models\Defaulter;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    protected string $accountSid;
    protected string $authToken;
    protected string $fromNumber;

    public function __construct()
    {
        $this->accountSid = config('services.twilio.account_sid', '');
        $this->authToken = config('services.twilio.auth_token', '');
        $this->fromNumber = config('services.twilio.from_number', '');
    }

    public function sendDefaulterReminder(Defaulter $defaulter): array
    {
        $business = $defaulter->business;
        
        $message = "Dear {$business->owner_name}, \n\n" .
                   "Your payment of NGN " . number_format($defaulter->amount_due, 2) . " " .
                   "is {$defaulter->days_overdue} days overdue. " .
                   "Please make payment to avoid penalties.\n\n" .
                   "Thank you.\n" .
                   "- {$defaulter->tenant->name}";

        return $this->sendSms($business->phone, $message);
    }

    public function sendSms(string $to, string $message): array
    {
        // If Twilio credentials not configured, return mock success
        if (empty($this->accountSid) || empty($this->authToken)) {
            Log::info('SMS Mock Sent', [
                'to' => $to,
                'message' => $message,
            ]);

            return [
                'success' => true,
                'message_sid' => 'MOCK_' . uniqid(),
                'mocked' => true,
            ];
        }

        try {
            $response = Http::withBasicAuth($this->accountSid, $this->authToken)
                ->asForm()
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$this->accountSid}/Messages.json", [
                    'From' => $this->fromNumber,
                    'To' => $to,
                    'Body' => $message,
                ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message_sid' => $response->json('sid'),
                ];
            }

            return [
                'success' => false,
                'error' => $response->json('message') ?? 'Unknown error',
            ];
        } catch (\Exception $e) {
            Log::error('SMS sending failed', [
                'error' => $e->getMessage(),
                'to' => $to,
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
