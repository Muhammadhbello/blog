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
            $table->foreignId('revenue_item_id')->constrained('revenue_items')->onDelete('cascade');
            $table->decimal('amount', 10, 2);
            $table->date('valid_from');
            $table->date('valid_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['revenue_item_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tariff_rules');
    }
};
