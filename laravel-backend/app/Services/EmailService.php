<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class EmailService
{
    protected array $settings;

    public function __construct()
    {
        $this->loadSettings();
    }

    protected function loadSettings(): void
    {
        $settings = DB::connection('tenant')
            ->table('email_settings')
            ->first();

        $this->settings = $settings ? (array) $settings : [
            'provider' => 'smtp',
            'from_email' => config('mail.from.address'),
            'from_name' => config('mail.from.name'),
            'is_active' => false,
        ];
    }

    /**
     * Send an email using a template
     */
    public function sendFromTemplate(string $templateType, string $recipientEmail, array $data): array
    {
        if (!$this->settings['is_active']) {
            return ['success' => false, 'message' => 'Email service is not active'];
        }

        // Get template
        $template = DB::connection('tenant')
            ->table('notification_templates')
            ->where('type', $templateType)
            ->where('is_active', true)
            ->first();

        if (!$template) {
            return ['success' => false, 'message' => 'Email template not found'];
        }

        // Parse template
        $subject = $this->parseTemplate($template->email_subject ?? $template->name, $data);
        $body = $this->parseTemplate($template->email_template ?? $template->sms_template, $data);

        return $this->send($recipientEmail, $subject, $body, $data);
    }

    /**
     * Send a raw email
     */
    public function send(string $to, string $subject, string $body, array $data = []): array
    {
        try {
            Mail::send([], [], function ($message) use ($to, $subject, $body) {
                $message->to($to)
                    ->subject($subject)
                    ->html($this->wrapInTemplate($body));
            });

            // Log email
            $this->logEmail($to, $subject, 'sent', $data);

            return ['success' => true, 'message' => 'Email sent successfully'];
        } catch (\Exception $e) {
            Log::error('Email sending failed', [
                'to' => $to,
                'subject' => $subject,
                'error' => $e->getMessage(),
            ]);

            $this->logEmail($to, $subject, 'failed', $data, $e->getMessage());

            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Send invoice notification
     */
    public function sendInvoiceIssued(int $invoiceId): array
    {
        $invoice = DB::connection('tenant')
            ->table('invoices')
            ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
            ->where('invoices.id', $invoiceId)
            ->select('invoices.*', 'businesses.business_name', 'businesses.owner_email', 'businesses.owner_name')
            ->first();

        if (!$invoice || !$invoice->owner_email) {
            return ['success' => false, 'message' => 'Invoice or email not found'];
        }

        $tenant = DB::connection('tenant')->table('tenant_settings')->where('key', 'tenant_name')->first();

        return $this->sendFromTemplate('invoice_issued', $invoice->owner_email, [
            'tenant_name' => $tenant->value ?? 'FlexCloud LGA',
            'business_name' => $invoice->business_name,
            'owner_name' => $invoice->owner_name,
            'invoice_number' => $invoice->invoice_number,
            'amount' => number_format($invoice->total_amount, 2),
            'due_date' => date('F j, Y', strtotime($invoice->due_date)),
            'balance' => number_format($invoice->balance, 2),
        ]);
    }

    /**
     * Send payment confirmation
     */
    public function sendPaymentReceived(int $paymentId): array
    {
        $payment = DB::connection('tenant')
            ->table('invoice_payments')
            ->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
            ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
            ->where('invoice_payments.id', $paymentId)
            ->select(
                'invoice_payments.*',
                'invoices.invoice_number',
                'invoices.balance',
                'businesses.business_name',
                'businesses.owner_email',
                'businesses.owner_name'
            )
            ->first();

        if (!$payment || !$payment->owner_email) {
            return ['success' => false, 'message' => 'Payment or email not found'];
        }

        $tenant = DB::connection('tenant')->table('tenant_settings')->where('key', 'tenant_name')->first();

        return $this->sendFromTemplate('payment_received', $payment->owner_email, [
            'tenant_name' => $tenant->value ?? 'FlexCloud LGA',
            'business_name' => $payment->business_name,
            'owner_name' => $payment->owner_name,
            'invoice_number' => $payment->invoice_number,
            'amount' => number_format($payment->amount, 2),
            'reference' => $payment->reference,
            'payment_date' => date('F j, Y', strtotime($payment->created_at)),
            'balance' => number_format($payment->balance, 2),
        ]);
    }

    /**
     * Send overdue reminder
     */
    public function sendOverdueReminder(int $invoiceId): array
    {
        $invoice = DB::connection('tenant')
            ->table('invoices')
            ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
            ->where('invoices.id', $invoiceId)
            ->select('invoices.*', 'businesses.business_name', 'businesses.owner_email', 'businesses.owner_name')
            ->first();

        if (!$invoice || !$invoice->owner_email) {
            return ['success' => false, 'message' => 'Invoice or email not found'];
        }

        $daysOverdue = now()->diffInDays($invoice->due_date);
        $tenant = DB::connection('tenant')->table('tenant_settings')->where('key', 'tenant_name')->first();

        return $this->sendFromTemplate('invoice_overdue', $invoice->owner_email, [
            'tenant_name' => $tenant->value ?? 'FlexCloud LGA',
            'business_name' => $invoice->business_name,
            'owner_name' => $invoice->owner_name,
            'invoice_number' => $invoice->invoice_number,
            'amount' => number_format($invoice->balance, 2),
            'due_date' => date('F j, Y', strtotime($invoice->due_date)),
            'days_overdue' => $daysOverdue,
        ]);
    }

    /**
     * Send bulk emails
     */
    public function sendBulk(array $recipients, string $templateType, array $commonData = []): array
    {
        $results = ['success' => 0, 'failed' => 0, 'errors' => []];

        foreach ($recipients as $recipient) {
            $data = array_merge($commonData, $recipient['data'] ?? []);
            $result = $this->sendFromTemplate($templateType, $recipient['email'], $data);

            if ($result['success']) {
                $results['success']++;
            } else {
                $results['failed']++;
                $results['errors'][] = [
                    'email' => $recipient['email'],
                    'error' => $result['message'],
                ];
            }
        }

        return $results;
    }

    /**
     * Parse template placeholders
     */
    protected function parseTemplate(string $template, array $data): string
    {
        foreach ($data as $key => $value) {
            $template = str_replace('{{' . $key . '}}', $value, $template);
        }
        return $template;
    }

    /**
     * Wrap content in email template
     */
    protected function wrapInTemplate(string $content): string
    {
        $tenant = DB::connection('tenant')->table('tenant_settings')->where('key', 'tenant_name')->first();
        $tenantName = $tenant->value ?? 'FlexCloud LGA';

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; }
        .info-box { background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
        .amount { font-size: 28px; font-weight: bold; color: #2563eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{$tenantName}</h1>
        </div>
        <div class="content">
            {$content}
        </div>
        <div class="footer">
            <p>This is an automated message from {$tenantName}.</p>
            <p>Powered by FlexCloud Revenue Management System</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Log email to database
     */
    protected function logEmail(string $to, string $subject, string $status, array $data = [], ?string $error = null): void
    {
        DB::connection('tenant')->table('email_logs')->insert([
            'recipient' => $to,
            'subject' => $subject,
            'status' => $status,
            'data' => json_encode($data),
            'error' => $error,
            'sent_at' => $status === 'sent' ? now() : null,
            'created_at' => now(),
        ]);
    }

    /**
     * Get email logs
     */
    public function getLogs(int $limit = 100): \Illuminate\Support\Collection
    {
        return DB::connection('tenant')
            ->table('email_logs')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get email stats
     */
    public function getStats(): array
    {
        $today = now()->toDateString();

        return [
            'total_sent' => DB::connection('tenant')->table('email_logs')->where('status', 'sent')->count(),
            'total_failed' => DB::connection('tenant')->table('email_logs')->where('status', 'failed')->count(),
            'sent_today' => DB::connection('tenant')
                ->table('email_logs')
                ->where('status', 'sent')
                ->whereDate('created_at', $today)
                ->count(),
        ];
    }
}
