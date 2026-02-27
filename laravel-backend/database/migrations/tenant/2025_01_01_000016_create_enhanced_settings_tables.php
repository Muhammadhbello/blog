<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Enhanced Payment settings per tenant
        Schema::create('payment_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('provider', ['paymentpoint', 'palmpay'])->unique();
            $table->enum('mode', ['test', 'live'])->default('test');
            $table->string('merchant_id')->nullable();
            $table->string('public_key')->nullable();
            $table->text('secret_key')->nullable(); // Encrypted
            $table->string('base_url')->nullable();
            $table->text('webhook_secret')->nullable(); // Encrypted
            $table->boolean('is_enabled')->default(false);
            $table->timestamp('last_tested_at')->nullable();
            $table->enum('last_test_status', ['success', 'failed'])->nullable();
            $table->text('last_test_message')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            
            $table->index(['provider', 'is_enabled']);
        });

        // Enhanced SMS settings per tenant
        Schema::create('sms_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('provider', ['termii', 'twilio', 'africas_talking'])->unique();
            $table->enum('mode', ['test', 'live'])->default('test');
            $table->text('api_key')->nullable(); // Encrypted
            $table->string('sender_id')->nullable();
            $table->string('route')->default('generic');
            $table->json('additional_config')->nullable();
            $table->boolean('is_enabled')->default(false);
            $table->timestamp('last_tested_at')->nullable();
            $table->enum('last_test_status', ['success', 'failed'])->nullable();
            $table->text('last_test_message')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            
            $table->index(['provider', 'is_enabled']);
        });

        // Message templates
        Schema::create('message_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('channel', ['sms', 'email', 'payment_notification']);
            $table->string('key'); // e.g., invoice_created, payment_received
            $table->string('name');
            $table->string('subject')->nullable();
            $table->longText('body');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->unique(['channel', 'key']);
        });

        // Tenant general settings
        Schema::create('tenant_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string');
            $table->string('group')->default('general');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Seed default templates
        $this->seedDefaultTemplates();
    }

    protected function seedDefaultTemplates(): void
    {
        $templates = [
            // SMS Templates
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'channel' => 'sms',
                'key' => 'invoice_created',
                'name' => 'Invoice Created',
                'subject' => null,
                'body' => 'Dear {{business_name}}, Invoice #{{invoice_number}} for {{amount}} has been generated. Due: {{due_date}}. Pay via {{payment_link}}. - {{tenant_name}}',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'channel' => 'sms',
                'key' => 'payment_received',
                'name' => 'Payment Received',
                'subject' => null,
                'body' => 'Thank you {{business_name}}! Your payment of {{amount}} for Invoice #{{invoice_number}} has been received. Receipt: {{receipt_number}}. - {{tenant_name}}',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'channel' => 'sms',
                'key' => 'invoice_reminder',
                'name' => 'Invoice Reminder',
                'subject' => null,
                'body' => 'Reminder: {{business_name}}, Invoice #{{invoice_number}} for {{amount}} is due on {{due_date}}. Please pay to avoid penalties. - {{tenant_name}}',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'channel' => 'sms',
                'key' => 'defaulter_reminder',
                'name' => 'Defaulter Reminder',
                'subject' => null,
                'body' => 'OVERDUE: {{business_name}}, you have {{amount}} outstanding for {{days_overdue}} days. Immediate payment required. - {{tenant_name}}',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'channel' => 'sms',
                'key' => 'ticket_sold',
                'name' => 'Ticket Sold',
                'subject' => null,
                'body' => 'Ticket #{{ticket_number}} issued for {{amount}}. Valid for: {{item_name}}. - {{tenant_name}}',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Email Templates
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'channel' => 'email',
                'key' => 'invoice_created',
                'name' => 'Invoice Created Email',
                'subject' => 'Invoice #{{invoice_number}} from {{tenant_name}}',
                'body' => '<h2>Invoice Generated</h2><p>Dear {{business_name}},</p><p>A new invoice has been generated for your business:</p><ul><li><strong>Invoice Number:</strong> {{invoice_number}}</li><li><strong>Amount:</strong> {{amount}}</li><li><strong>Due Date:</strong> {{due_date}}</li></ul><p><a href="{{payment_link}}">Click here to pay online</a></p><p>Regards,<br>{{tenant_name}}</p>',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'channel' => 'email',
                'key' => 'payment_received',
                'name' => 'Payment Received Email',
                'subject' => 'Payment Confirmation - {{tenant_name}}',
                'body' => '<h2>Payment Received</h2><p>Dear {{business_name}},</p><p>We have received your payment:</p><ul><li><strong>Amount:</strong> {{amount}}</li><li><strong>Invoice:</strong> #{{invoice_number}}</li><li><strong>Receipt:</strong> {{receipt_number}}</li><li><strong>Date:</strong> {{payment_date}}</li></ul><p>Thank you for your payment!</p><p>Regards,<br>{{tenant_name}}</p>',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('message_templates')->insert($templates);
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_settings');
        Schema::dropIfExists('message_templates');
        Schema::dropIfExists('sms_settings');
        Schema::dropIfExists('payment_settings');
    }
};
