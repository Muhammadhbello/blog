<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('module')->nullable()->after('action');
            $table->string('entity_type')->nullable()->after('module');
            $table->unsignedBigInteger('entity_id')->nullable()->after('entity_type');
            $table->json('old_values')->nullable()->after('details');
            $table->json('new_values')->nullable()->after('old_values');
            $table->string('user_agent')->nullable()->after('ip_address');
            
            $table->index(['tenant_id', 'created_at']);
            $table->index(['user_id', 'action']);
            $table->index(['entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'created_at']);
            $table->dropIndex(['user_id', 'action']);
            $table->dropIndex(['entity_type', 'entity_id']);
            $table->dropColumn(['module', 'entity_type', 'entity_id', 'old_values', 'new_values', 'user_agent']);
        });
    }
};
