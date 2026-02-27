<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations on PLATFORM database.
     */
    public function up(): void
    {
        // Revenue share rules (overrides per tenant/category/item)
        Schema::create('revenue_share_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('category_id')->nullable();
            $table->unsignedBigInteger('item_id')->nullable();
            $table->decimal('rate', 5, 2); // Percentage rate
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->date('effective_from')->nullable();
            $table->date('effective_until')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'category_id', 'item_id']);
            $table->index('is_active');
        });

        // Revenue transactions log (central platform tracking)
        Schema::create('revenue_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->decimal('gross_amount', 15, 2);
            $table->decimal('platform_fee', 15, 2);
            $table->decimal('consultant_share', 15, 2)->default(0);
            $table->decimal('net_tenant_amount', 15, 2);
            $table->string('share_model'); // percentage, tiered, flat, hybrid
            $table->string('transaction_type')->default('general'); // invoice, ticket, payment
            $table->string('source_type')->nullable(); // Invoice, Ticket, etc.
            $table->unsignedBigInteger('source_id')->nullable();
            $table->unsignedBigInteger('category_id')->nullable();
            $table->unsignedBigInteger('item_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('transaction_type');
            $table->index('created_at');
            $table->index(['source_type', 'source_id']);
        });

        // Platform audit logs
        Schema::create('platform_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('user_type'); // platform_user, tenant_user, system
            $table->string('action'); // create, update, delete, login, logout, impersonate
            $table->string('entity_type'); // Tenant, RevenueShareRule, etc.
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('session_id')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index(['entity_type', 'entity_id']);
            $table->index('action');
            $table->index('created_at');
        });

        // Platform impersonation sessions
        Schema::create('impersonation_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('platform_user_id');
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('impersonated_user_id')->nullable();
            $table->string('session_token')->unique();
            $table->string('reason')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index('platform_user_id');
            $table->index('tenant_id');
            $table->index('session_token');
        });

        // Platform settings
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string'); // string, integer, boolean, json
            $table->string('group')->default('general');
            $table->text('description')->nullable();
            $table->boolean('is_public')->default(false);
            $table->timestamps();

            $table->index('group');
        });

        // Tenant billing/subscription (future: SaaS billing)
        Schema::create('tenant_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('plan'); // free, basic, professional, enterprise
            $table->string('billing_cycle')->default('monthly'); // monthly, yearly
            $table->decimal('amount', 10, 2)->default(0);
            $table->string('currency', 3)->default('NGN');
            $table->date('current_period_start');
            $table->date('current_period_end');
            $table->string('status')->default('active'); // active, past_due, cancelled, trialing
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('status');
            $table->index('current_period_end');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_subscriptions');
        Schema::dropIfExists('platform_settings');
        Schema::dropIfExists('impersonation_sessions');
        Schema::dropIfExists('platform_audit_logs');
        Schema::dropIfExists('revenue_transactions');
        Schema::dropIfExists('revenue_share_rules');
    }
};
