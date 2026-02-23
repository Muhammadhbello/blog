<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tariff_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('revenue_item_id')->constrained()->onDelete('cascade');
            $table->enum('business_size', ['small', 'medium', 'enterprise'])->nullable();
            $table->string('business_category')->nullable();
            $table->string('business_sub_category')->nullable();
            $table->decimal('amount', 12, 2);
            $table->text('conditions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['revenue_item_id', 'business_size']);
            $table->index(['business_category', 'business_sub_category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tariff_rules');
    }
};
