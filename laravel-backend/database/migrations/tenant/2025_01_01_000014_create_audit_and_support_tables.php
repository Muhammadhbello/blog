<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable();
            $table->enum('user_type', ['tenant_user', 'consultant', 'business'])->default('tenant_user');
            $table->string('action');
            $table->string('module');
            $table->string('entity_type')->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->json('details')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'action']);
            $table->index(['module', 'created_at']);
            $table->index(['entity_type', 'entity_id']);
        });

        // Defaulters tracking
        Schema::create('defaulters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('invoice_id')->constrained()->onDelete('cascade');
            $table->decimal('outstanding_amount', 12, 2);
            $table->integer('days_overdue')->default(0);
            $table->integer('reminder_count')->default(0);
            $table->timestamp('last_reminder_at')->nullable();
            $table->enum('status', ['active', 'resolved', 'written_off'])->default('active');
            $table->timestamps();
            
            $table->index(['business_id', 'status']);
            $table->index(['days_overdue', 'status']);
        });

        // SMS logs
        Schema::create('sms_logs', function (Blueprint $table) {
            $table->id();
            $table->string('recipient');
            $table->text('message');
            $table->string('template_slug')->nullable();
            $table->string('message_id')->nullable();
            $table->enum('status', ['pending', 'sent', 'delivered', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            $table->json('response')->nullable();
            $table->string('entity_type')->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->timestamps();
            
            $table->index(['recipient', 'status']);
            $table->index(['entity_type', 'entity_id']);
        });

        // Roles and permissions for tenant
        Schema::create('tenant_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->json('permissions')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        Schema::create('tenant_role_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('tenant_users')->onDelete('cascade');
            $table->foreignId('role_id')->constrained('tenant_roles')->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['user_id', 'role_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_role_user');
        Schema::dropIfExists('tenant_roles');
        Schema::dropIfExists('sms_logs');
        Schema::dropIfExists('defaulters');
        Schema::dropIfExists('tenant_audit_logs');
    }
};
