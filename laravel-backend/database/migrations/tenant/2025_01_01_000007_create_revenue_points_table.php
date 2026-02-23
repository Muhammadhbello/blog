<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revenue_points', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->foreignId('ward_id')->constrained()->onDelete('cascade');
            $table->foreignId('department_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('type', ['market', 'park', 'slaughter', 'motor_park', 'loading_bay', 'toll_gate', 'other'])->default('market');
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->enum('closing_frequency', ['daily', 'weekly'])->default('daily');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['ward_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenue_points');
    }
};
