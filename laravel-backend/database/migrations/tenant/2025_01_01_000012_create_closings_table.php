<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('closings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('revenue_point_id')->constrained()->onDelete('cascade');
            $table->foreignId('submitted_by')->nullable();
            $table->enum('submitted_by_type', ['user', 'consultant'])->default('user');
            
            // Period
            $table->enum('period_type', ['daily', 'weekly'])->default('daily');
            $table->date('period_start');
            $table->date('period_end');
            
            // Expected vs Actual
            $table->decimal('expected_amount', 12, 2);
            $table->decimal('remitted_amount', 12, 2);
            $table->decimal('variance', 12, 2)->default(0);
            $table->decimal('variance_percentage', 5, 2)->default(0);
            
            // Breakdown
            $table->integer('tickets_sold')->default(0);
            $table->decimal('ticket_revenue', 12, 2)->default(0);
            $table->decimal('cash_collected', 12, 2)->default(0);
            $table->decimal('transfer_collected', 12, 2)->default(0);
            $table->decimal('pos_collected', 12, 2)->default(0);
            
            // Remittance details
            $table->enum('remittance_method', ['cash', 'transfer', 'deposit'])->default('transfer');
            $table->string('remittance_reference')->nullable();
            $table->string('proof_url')->nullable();
            $table->text('notes')->nullable();
            
            // Status workflow
            $table->enum('status', ['draft', 'submitted', 'pending_approval', 'approved', 'variance_flagged', 'rejected'])->default('draft');
            $table->foreignId('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('approval_notes')->nullable();
            
            $table->timestamps();
            
            $table->index(['revenue_point_id', 'period_start']);
            $table->index(['submitted_by', 'status']);
            $table->index(['status', 'period_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('closings');
    }
};
