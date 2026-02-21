<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('owner_name');
            $table->string('phone');
            $table->text('address')->nullable();
            $table->string('rc_number')->nullable();
            $table->string('virtual_account_number')->nullable()->unique();
            $table->string('virtual_account_bank')->nullable();
            $table->string('provider_ref')->nullable();
            $table->boolean('is_account_active')->default(false);
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            $table->index(['tenant_id', 'phone']);
            $table->index('virtual_account_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('businesses');
    }
};
