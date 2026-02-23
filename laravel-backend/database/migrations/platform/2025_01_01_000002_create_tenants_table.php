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
            $table->string('subdomain')->unique();
            $table->string('db_name')->unique();
            $table->string('domain')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('brand_color')->default('#3B82F6');
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->text('address')->nullable();
            $table->string('state')->nullable();
            $table->string('lga_code')->nullable();
            $table->enum('revenue_share_model', ['percentage', 'fixed'])->default('percentage');
            $table->decimal('share_value', 10, 2)->default(5.00);
            $table->enum('status', ['active', 'suspended', 'inactive', 'pending'])->default('pending');
            $table->json('settings')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
