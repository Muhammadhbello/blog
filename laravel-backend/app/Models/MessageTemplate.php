<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class MessageTemplate extends Model
{
    use HasUuids;

    protected $connection = 'tenant';
    
    protected $fillable = [
        'channel',
        'key',
        'name',
        'subject',
        'body',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get available placeholders for a template key
     */
    public static function getPlaceholders(string $key): array
    {
        $placeholders = [
            'invoice_created' => [
                '{{business_name}}' => 'Business name',
                '{{invoice_number}}' => 'Invoice number',
                '{{amount}}' => 'Invoice amount',
                '{{due_date}}' => 'Due date',
                '{{payment_link}}' => 'Online payment link',
                '{{tenant_name}}' => 'Organization name',
            ],
            'payment_received' => [
                '{{business_name}}' => 'Business name',
                '{{amount}}' => 'Payment amount',
                '{{invoice_number}}' => 'Invoice number',
                '{{receipt_number}}' => 'Receipt number',
                '{{payment_date}}' => 'Payment date',
                '{{tenant_name}}' => 'Organization name',
            ],
            'invoice_reminder' => [
                '{{business_name}}' => 'Business name',
                '{{invoice_number}}' => 'Invoice number',
                '{{amount}}' => 'Amount due',
                '{{due_date}}' => 'Due date',
                '{{tenant_name}}' => 'Organization name',
            ],
            'defaulter_reminder' => [
                '{{business_name}}' => 'Business name',
                '{{amount}}' => 'Outstanding amount',
                '{{days_overdue}}' => 'Days overdue',
                '{{tenant_name}}' => 'Organization name',
            ],
            'ticket_sold' => [
                '{{ticket_number}}' => 'Ticket number',
                '{{amount}}' => 'Ticket amount',
                '{{item_name}}' => 'Revenue item name',
                '{{tenant_name}}' => 'Organization name',
            ],
        ];

        return $placeholders[$key] ?? [];
    }

    /**
     * Render template with data
     */
    public function render(array $data): string
    {
        $content = $this->body;
        
        foreach ($data as $key => $value) {
            $content = str_replace('{{' . $key . '}}', $value, $content);
        }
        
        return $content;
    }
}
