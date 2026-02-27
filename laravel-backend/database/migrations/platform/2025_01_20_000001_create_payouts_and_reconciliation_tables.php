<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Payouts table for tracking tenant payouts
        Schema::connection('platform')->create('payouts', function (Blueprint $table) {
            $table->string('id', 20)->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->decimal('amount', 15, 2)->comment('Gross amount before platform fee');
            $table->decimal('platform_fee', 15, 2)->comment('Platform fee deducted');
            $table->decimal('net_amount', 15, 2)->comment('Net amount to be paid to tenant');
            $table->integer('transaction_count')->default(0);
            $table->date('period_start');
            $table->date('period_end');
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->string('bank_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('account_name')->nullable();
            $table->string('reference')->nullable()->comment('Transfer reference after processing');
            $table->text('failure_reason')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['period_start', 'period_end']);
            $table->index('status');
        });

        // Tenant bank accounts
        Schema::connection('platform')->create('tenant_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('bank_name');
            $table->string('bank_code')->nullable();
            $table->string('account_number');
            $table->string('account_name');
            $table->boolean('is_primary')->default(false);
            $table->boolean('is_verified')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'account_number']);
        });

        // Reconciliation periods
        Schema::connection('platform')->create('reconciliation_periods', function (Blueprint $table) {
            $table->id();
            $table->string('period');
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'failed'])->default('pending');
            $table->integer('total_transactions')->default(0);
            $table->integer('matched')->default(0);
            $table->integer('unmatched')->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->timestamps();

            $table->index(['start_date', 'end_date']);
            $table->index('status');
        });

        // Reconciliation records
        Schema::connection('platform')->create('reconciliation_records', function (Blueprint $table) {
            $table->string('id', 20)->primary();
            $table->foreignId('period_id')->nullable()->constrained('reconciliation_periods')->onDelete('set null');
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->enum('type', ['payment', 'refund', 'fee', 'adjustment'])->default('payment');
            $table->decimal('amount', 15, 2);
            $table->string('reference');
            $table->string('invoice_number')->nullable();
            $table->string('business_name')->nullable();
            $table->enum('status', ['matched', 'unmatched', 'disputed', 'resolved'])->default('unmatched');
            $table->string('gateway')->nullable();
            $table->string('gateway_reference')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('reconciled_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('platform_users')->onDelete('set null');
            $table->timestamp('created_at');
            $table->timestamp('updated_at');

            $table->index(['tenant_id', 'status']);
            $table->index('status');
            $table->index('reference');
            $table->index('gateway_reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('platform')->dropIfExists('reconciliation_records');
        Schema::connection('platform')->dropIfExists('reconciliation_periods');
        Schema::connection('platform')->dropIfExists('tenant_bank_accounts');
        Schema::connection('platform')->dropIfExists('payouts');
    }
};
