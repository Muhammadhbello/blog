<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('user_name')->nullable();
            $table->string('user_email')->nullable();
            $table->string('user_role')->nullable();
            $table->string('action'); // create, update, delete, access, bulk_create, etc.
            $table->string('module'); // invoices, businesses, tickets, settings, etc.
            $table->string('entity_type'); // Invoice, Business, Ticket, etc.
            $table->string('entity_id')->nullable();
            $table->json('details')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->boolean('is_impersonation')->default(false);
            $table->unsignedBigInteger('impersonator_id')->nullable();
            $table->timestamps();

            // Indexes for efficient querying
            $table->index('user_id');
            $table->index('action');
            $table->index('module');
            $table->index('entity_type');
            $table->index('created_at');
            $table->index(['entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
