<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('tenant_id')->constrained()->onDelete('set null');
            $table->json('assigned_wards')->nullable()->after('department_id');
            $table->json('assigned_revenue_points')->nullable()->after('assigned_wards');
            $table->string('avatar_url')->nullable()->after('phone');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropColumn(['department_id', 'assigned_wards', 'assigned_revenue_points', 'avatar_url', 'last_login_at']);
        });
    }
};
