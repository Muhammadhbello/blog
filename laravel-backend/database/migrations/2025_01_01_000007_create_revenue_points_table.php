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
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('ward_id')->constrained('wards')->onDelete('cascade');
            $table->string('location_name');
            $table->enum('type', ['market', 'park', 'office', 'school', 'bank', 'other'])->default('other');
            $table->timestamps();
            
            $table->index(['tenant_id', 'type']);
            $table->index('ward_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenue_points');
    }
};
