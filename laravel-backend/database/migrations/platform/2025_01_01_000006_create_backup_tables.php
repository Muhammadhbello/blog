<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Backup Records Table - Tracks all backup operations
     */
    public function up(): void
    {
        Schema::create('backup_records', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['platform', 'tenant', 'tenant_files'])->index();
            $table->string('tenant_slug')->nullable()->index();
            $table->string('filename');
            $table->string('filepath');
            $table->string('disk')->default('local'); // local, s3
            $table->bigInteger('size_bytes')->default(0);
            $table->string('size_human')->nullable();
            $table->enum('status', ['pending', 'running', 'completed', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            $table->string('checksum')->nullable(); // MD5/SHA256 for integrity
            $table->boolean('is_encrypted')->default(false);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('duration_seconds')->nullable();
            $table->unsignedBigInteger('triggered_by')->nullable(); // platform_user_id
            $table->string('trigger_type')->default('manual'); // manual, scheduled
            $table->timestamps();
            
            $table->index(['type', 'tenant_slug', 'created_at']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('restore_records', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['platform', 'tenant'])->index();
            $table->string('tenant_slug')->nullable()->index();
            $table->unsignedBigInteger('backup_record_id')->nullable();
            $table->string('backup_filename');
            $table->enum('status', ['pending', 'running', 'completed', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            $table->integer('progress_percent')->default(0);
            $table->string('current_step')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('duration_seconds')->nullable();
            $table->unsignedBigInteger('triggered_by')->nullable();
            $table->boolean('requires_confirmation')->default(true);
            $table->string('confirmation_token')->nullable();
            $table->timestamps();
            
            $table->foreign('backup_record_id')
                  ->references('id')
                  ->on('backup_records')
                  ->nullOnDelete();
                  
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restore_records');
        Schema::dropIfExists('backup_records');
    }
};
