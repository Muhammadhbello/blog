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
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('revenue_item_id')->constrained('revenue_items')->onDelete('cascade');
            $table->string('batch_number')->unique();
            $table->integer('start_serial');
            $table->integer('end_serial');
            $table->integer('total_tickets');
            $table->enum('status', ['active', 'completed', 'void'])->default('active');
            $table->timestamps();
            
            $table->index(['tenant_id', 'status']);
            $table->index('batch_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_batches');
    }
};
