<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SMS templates for defaulter reminders and other purposes
        Schema::create('sms_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->enum('type', ['defaulter_reminder', 'payment_reminder', 'final_notice', 'custom', 'invoice_reminder', 'closing_notification']);
            $table->text('content');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // SMS logs table
        Schema::create('sms_logs', function (Blueprint $table) {
            $table->id();
            $table->string('recipient');
            $table->text('message');
            $table->string('template_slug')->nullable();
            $table->enum('status', ['pending', 'sent', 'failed', 'delivered']);
            $table->string('entity_type')->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('message_id')->nullable();
            $table->json('response')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
            $table->index('status');
            $table->index('created_at');
        });

        // Seed default templates
        DB::table('sms_templates')->insert([
            [
                'name' => 'Default Reminder',
                'slug' => 'defaulter_reminder',
                'type' => 'defaulter_reminder',
                'content' => 'Dear {name}, you have an outstanding balance of NGN{amount}. Please make payment to avoid penalties. - {tenant_name}',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Payment Reminder',
                'slug' => 'payment_reminder',
                'type' => 'payment_reminder',
                'content' => 'Hi {name}, your payment of NGN{amount} is due. Please pay promptly. Ref: {invoice_number}. - {tenant_name}',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Final Notice',
                'slug' => 'final_notice',
                'type' => 'final_notice',
                'content' => 'FINAL NOTICE: {name}, your invoice #{invoice_number} for NGN{amount} is overdue by {days_overdue} days. Immediate action required. - {tenant_name}',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_logs');
        Schema::dropIfExists('sms_templates');
    }
};
