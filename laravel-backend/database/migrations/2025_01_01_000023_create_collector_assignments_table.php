<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collector_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('collector_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('revenue_point_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('ward_id')->nullable()->constrained()->onDelete('cascade');
            $table->date('assigned_date');
            $table->date('end_date')->nullable();
            $table->enum('status', ['active', 'inactive', 'completed'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['collector_id', 'status']);
            $table->index(['tenant_id', 'assigned_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collector_assignments');
    }
};
