<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Custom Domains & Backup System Enhancement
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Custom Domain Support
            $table->string('custom_domain')->nullable()->after('subdomain');
            $table->boolean('custom_domain_verified')->default(false)->after('custom_domain');
            $table->string('custom_domain_verification_token')->nullable()->after('custom_domain_verified');
            $table->timestamp('custom_domain_verified_at')->nullable()->after('custom_domain_verification_token');
            $table->boolean('ssl_enabled')->default(false)->after('custom_domain_verified_at');
            $table->timestamp('ssl_expires_at')->nullable()->after('ssl_enabled');
            
            // Backup & Maintenance
            $table->boolean('is_in_maintenance')->default(false)->after('status');
            $table->string('maintenance_reason')->nullable()->after('is_in_maintenance');
            $table->timestamp('maintenance_started_at')->nullable()->after('maintenance_reason');
            $table->timestamp('last_backup_at')->nullable()->after('maintenance_started_at');
            $table->string('last_backup_status')->nullable()->after('last_backup_at');
            $table->string('last_backup_size')->nullable()->after('last_backup_status');
            $table->integer('backup_retention_days')->default(14)->after('last_backup_size');
            
            // Indexes
            $table->index('custom_domain');
            $table->index('is_in_maintenance');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'custom_domain',
                'custom_domain_verified',
                'custom_domain_verification_token',
                'custom_domain_verified_at',
                'ssl_enabled',
                'ssl_expires_at',
                'is_in_maintenance',
                'maintenance_reason',
                'maintenance_started_at',
                'last_backup_at',
                'last_backup_status',
                'last_backup_size',
                'backup_retention_days',
            ]);
        });
    }
};
