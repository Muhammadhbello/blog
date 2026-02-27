<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Consultant wallets
        Schema::create('consultant_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultant_id')->constrained('users')->onDelete('cascade');
            $table->decimal('balance', 15, 2)->default(0);
            $table->decimal('total_earned', 15, 2)->default(0);
            $table->decimal('total_withdrawn', 15, 2)->default(0);
            $table->decimal('pending_commission', 15, 2)->default(0);
            $table->string('status')->default('active'); // active, frozen, suspended
            $table->timestamp('last_transaction_at')->nullable();
            $table->timestamps();
            
            $table->unique('consultant_id');
            $table->index('status');
        });

        // Commission rules per consultant type
        Schema::create('commission_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('consultant_type'); // individual, company, internal
            $table->string('rule_type'); // percentage, fixed, tiered
            $table->decimal('rate', 5, 2)->nullable(); // For percentage
            $table->decimal('fixed_amount', 10, 2)->nullable(); // For fixed
            $table->json('tiers')->nullable(); // For tiered {"0-100000": 10, "100001-500000": 8}
            $table->unsignedBigInteger('revenue_item_id')->nullable(); // Specific item override
            $table->unsignedBigInteger('revenue_category_id')->nullable(); // Category override
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index('consultant_type');
            $table->index('is_active');
        });

        // Wallet transactions
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained('consultant_wallets')->onDelete('cascade');
            $table->string('type'); // commission, withdrawal, adjustment, bonus, penalty
            $table->decimal('amount', 15, 2);
            $table->decimal('balance_before', 15, 2);
            $table->decimal('balance_after', 15, 2);
            $table->string('reference')->unique();
            $table->string('source_type')->nullable(); // Ticket, Invoice, Manual
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('status')->default('completed'); // pending, completed, reversed
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users');
            $table->timestamps();
            
            $table->index('wallet_id');
            $table->index('type');
            $table->index('status');
            $table->index('reference');
        });

        // Withdrawal requests
        Schema::create('withdrawal_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained('consultant_wallets')->onDelete('cascade');
            $table->foreignId('consultant_id')->constrained('users')->onDelete('cascade');
            $table->decimal('amount', 15, 2);
            $table->string('bank_name');
            $table->string('account_number');
            $table->string('account_name');
            $table->string('status')->default('pending'); // pending, approved, processing, completed, rejected
            $table->text('rejection_reason')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users');
            $table->timestamp('processed_at')->nullable();
            $table->string('payment_reference')->nullable();
            $table->timestamps();
            
            $table->index('consultant_id');
            $table->index('status');
        });

        // Performance metrics
        Schema::create('consultant_performance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultant_id')->constrained('users')->onDelete('cascade');
            $table->date('period_date'); // First day of period
            $table->string('period_type'); // daily, weekly, monthly
            $table->integer('tickets_sold')->default(0);
            $table->integer('invoices_collected')->default(0);
            $table->decimal('gross_collection', 15, 2)->default(0);
            $table->decimal('commission_earned', 15, 2)->default(0);
            $table->integer('closings_submitted')->default(0);
            $table->integer('closings_approved')->default(0);
            $table->decimal('variance_total', 15, 2)->default(0);
            $table->decimal('performance_score', 5, 2)->default(0); // 0-100
            $table->timestamps();
            
            $table->unique(['consultant_id', 'period_date', 'period_type']);
            $table->index('period_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultant_performance');
        Schema::dropIfExists('withdrawal_requests');
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('commission_rules');
        Schema::dropIfExists('consultant_wallets');
    }
};
