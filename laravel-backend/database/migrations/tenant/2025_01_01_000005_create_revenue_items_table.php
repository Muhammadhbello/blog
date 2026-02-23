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
            $table->foreignId('category_id')->constrained('revenue_categories')->onDelete('cascade');
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->enum('type', ['ticket', 'invoice', 'permit', 'license', 'levy', 'fee'])->default('invoice');
            $table->enum('frequency', ['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'one_time'])->default('annual');
            $table->decimal('base_amount', 12, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['category_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenue_items');
    }
};
