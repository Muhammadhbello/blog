<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_batches', function (Blueprint $table) {
            $table->id();
            $table->string('batch_code')->unique();
            $table->foreignId('revenue_point_id')->constrained()->onDelete('cascade');
            $table->foreignId('revenue_item_id')->constrained()->onDelete('cascade');
            $table->foreignId('assigned_to')->nullable(); // tenant_user or consultant
            $table->enum('assigned_to_type', ['user', 'consultant'])->default('user');
            
            // Ticket range
            $table->integer('start_number');
            $table->integer('end_number');
            $table->integer('total_tickets');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('expected_amount', 12, 2);
            
            // Validity period
            $table->date('valid_from');
            $table->date('valid_to');
            
            // Status tracking
            $table->integer('tickets_sold')->default(0);
            $table->integer('tickets_cancelled')->default(0);
            $table->decimal('amount_collected', 12, 2)->default(0);
            $table->enum('status', ['active', 'closed', 'expired', 'cancelled'])->default('active');
            
            $table->foreignId('created_by')->nullable();
            $table->timestamps();
            
            $table->index(['assigned_to', 'status']);
            $table->index(['revenue_point_id', 'valid_from']);
        });

        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('ticket_batches')->onDelete('cascade');
            $table->string('ticket_number')->unique();
            $table->string('qr_code')->nullable();
            
            // Sale details
            $table->decimal('amount', 12, 2);
            $table->enum('payment_method', ['cash', 'transfer', 'pos'])->default('cash');
            $table->string('payment_reference')->nullable();
            $table->foreignId('sold_by')->nullable();
            $table->timestamp('sold_at')->nullable();
            
            // Payer info (optional)
            $table->string('payer_name')->nullable();
            $table->string('payer_phone')->nullable();
            $table->string('vehicle_number')->nullable();
            
            // Status
            $table->enum('status', ['available', 'sold', 'verified', 'cancelled'])->default('available');
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->foreignId('cancelled_by')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            
            // Sync status for offline POS
            $table->boolean('synced')->default(true);
            $table->timestamp('synced_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['batch_id', 'status']);
            $table->index(['sold_by', 'sold_at']);
        });

        Schema::create('ticket_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->onDelete('cascade');
            $table->decimal('amount', 12, 2);
            $table->enum('payment_method', ['cash', 'transfer', 'pos'])->default('cash');
            $table->string('payment_reference')->nullable();
            $table->enum('status', ['pending', 'success', 'failed'])->default('success');
            $table->foreignId('collected_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_payments');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('ticket_batches');
    }
};
