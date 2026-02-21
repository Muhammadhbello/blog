<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('batch_id')->constrained('ticket_batches')->onDelete('cascade');
            $table->string('serial_number')->unique();
            $table->text('qr_code')->nullable();
            $table->enum('status', ['available', 'sold', 'verified', 'void'])->default('available');
            $table->foreignId('sold_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('sold_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            
            $table->index(['tenant_id', 'status']);
            $table->index('batch_id');
            $table->index('serial_number');
            $table->index('sold_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
