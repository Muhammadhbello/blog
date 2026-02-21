<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revenue_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('category_id')->constrained('revenue_categories')->onDelete('cascade');
            $table->string('name');
            $table->enum('type', ['ticket', 'invoice', 'license', 'permit'])->default('ticket');
            $table->enum('frequency', ['daily', 'weekly', 'monthly', 'annual', 'one_time'])->default('daily');
            $table->decimal('default_amount', 10, 2)->default(0.00);
            $table->timestamps();
            
            $table->index(['tenant_id', 'type']);
            $table->index('category_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenue_items');
    }
};
