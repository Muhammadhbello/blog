<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('logo_url')->nullable();
            $table->string('brand_color', 7)->default('#3B82F6');
            $table->enum('revenue_share_model', ['percentage', 'fixed'])->default('percentage');
            $table->decimal('share_value', 10, 2)->default(5.00);
            $table->enum('status', ['active', 'suspended', 'inactive'])->default('active');
            $table->timestamps();
            
            $table->index('slug');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
