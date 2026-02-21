<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registrants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('name');
            $table->string('phone');
            $table->string('nid_number')->nullable();
            $table->string('virtual_account_number')->nullable()->unique();
            $table->string('provider_ref')->nullable();
            $table->timestamps();
            
            $table->index(['tenant_id', 'phone']);
            $table->index('virtual_account_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registrants');
    }
};
