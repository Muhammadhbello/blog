<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->onDelete('cascade');
            $table->foreignId('ticket_id')->nullable()->constrained('tickets')->onDelete('cascade');
            $table->decimal('amount_gross', 12, 2);
            $table->decimal('platform_fee', 12, 2)->default(0.00);
            $table->decimal('net_lga_amount', 12, 2);
            $table->enum('payment_method', ['virtual_account', 'cash', 'pos', 'bank_transfer'])->default('virtual_account');
            $table->string('reference')->unique();
            $table->string('payer_phone')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            
            $table->index(['tenant_id', 'payment_method']);
            $table->index('reference');
            $table->index('invoice_id');
            $table->index('ticket_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
