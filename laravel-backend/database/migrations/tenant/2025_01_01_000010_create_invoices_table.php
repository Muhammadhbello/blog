<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('revenue_item_id')->constrained()->onDelete('cascade');
            $table->foreignId('created_by')->nullable();
            
            // Amount tracking
            $table->decimal('subtotal', 12, 2);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('balance', 12, 2);
            
            // Revenue share calculation
            $table->decimal('platform_fee', 12, 2)->default(0);
            $table->decimal('net_lga_amount', 12, 2)->default(0);
            
            // Invoice details
            $table->text('description')->nullable();
            $table->date('issue_date');
            $table->date('due_date');
            $table->enum('period', ['monthly', 'quarterly', 'annual', 'one_time'])->default('annual');
            $table->year('fiscal_year');
            
            // Status tracking
            $table->enum('status', ['draft', 'issued', 'sent', 'partial', 'paid', 'overdue', 'cancelled'])->default('draft');
            $table->enum('delivery_status', ['not_sent', 'sent_sms', 'sent_email', 'printed', 'delivered'])->default('not_sent');
            
            // Payment link
            $table->string('payment_link')->nullable();
            $table->string('qr_code')->nullable();
            
            $table->timestamps();
            
            $table->index(['business_id', 'status']);
            $table->index(['status', 'due_date']);
            $table->index(['fiscal_year', 'status']);
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->onDelete('cascade');
            $table->foreignId('revenue_item_id')->constrained()->onDelete('cascade');
            $table->string('description');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });

        Schema::create('invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->onDelete('cascade');
            $table->decimal('amount', 12, 2);
            $table->enum('payment_method', ['cash', 'transfer', 'card', 'virtual_account', 'pos'])->default('transfer');
            $table->string('payment_reference')->nullable();
            $table->string('gateway_reference')->nullable();
            $table->string('gateway_provider')->nullable();
            $table->enum('status', ['initiated', 'pending', 'success', 'failed', 'reversed'])->default('pending');
            $table->json('gateway_response')->nullable();
            $table->foreignId('received_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            
            $table->index(['invoice_id', 'status']);
            $table->index(['payment_reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
    }
};
