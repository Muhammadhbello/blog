<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('phone')->nullable();
            $table->enum('role', [
                'chairman', 'treasurer', 'hod', 'consultant_admin', 
                'collector', 'auditor', 'agent_admin', 'business_user'
            ])->default('collector');
            $table->foreignId('department_id')->nullable();
            $table->string('avatar_url')->nullable();
            $table->json('assigned_wards')->nullable();
            $table->json('assigned_revenue_points')->nullable();
            $table->json('permissions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            
            $table->index(['role', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_users');
    }
};
