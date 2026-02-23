<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Payment settings per tenant
        Schema::create('payment_settings', function (Blueprint $table) {
            $table->id();
            $table->enum('provider', ['paymentpoint', 'palmpay'])->default('paymentpoint');
            $table->boolean('is_active')->default(false);
            $table->text('api_key')->nullable();
            $table->text('secret_key')->nullable();
            $table->text('merchant_id')->nullable();
            $table->string('webhook_secret')->nullable();
            $table->enum('environment', ['sandbox', 'production'])->default('sandbox');
            $table->json('additional_config')->nullable();
            $table->timestamps();
        });

        // SMS settings per tenant
        Schema::create('sms_settings', function (Blueprint $table) {
            $table->id();
            $table->enum('provider', ['termii', 'twilio', 'africas_talking'])->default('termii');
            $table->boolean('is_active')->default(false);
            $table->text('api_key')->nullable();
            $table->string('sender_id')->nullable();
            $table->string('route')->default('transactional');
            $table->json('additional_config')->nullable();
            $table->timestamps();
        });

        // Notification templates
        Schema::create('notification_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->enum('type', ['sms', 'email', 'both'])->default('sms');
            $table->enum('event', [
                'invoice_issued', 'invoice_paid', 'invoice_overdue', 'invoice_reminder',
                'ticket_sold', 'ticket_receipt',
                'closing_submitted', 'closing_approved', 'closing_rejected',
                'business_registered', 'payment_received', 'payment_failed'
            ]);
            $table->string('subject')->nullable(); // for email
            $table->text('sms_template')->nullable();
            $table->text('email_template')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
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
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_settings');
        Schema::dropIfExists('notification_templates');
        Schema::dropIfExists('sms_settings');
        Schema::dropIfExists('payment_settings');
    }
};
