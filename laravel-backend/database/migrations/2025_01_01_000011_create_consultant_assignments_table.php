<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultant_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('consultant_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('revenue_item_id')->nullable()->constrained('revenue_items')->onDelete('cascade');
            $table->foreignId('revenue_point_id')->nullable()->constrained('revenue_points')->onDelete('cascade');
            $table->decimal('commission_rate', 5, 2)->default(0.00);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            
            $table->index(['tenant_id', 'consultant_id', 'status']);
            $table->index('revenue_item_id');
            $table->index('revenue_point_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultant_assignments');
    }
};
