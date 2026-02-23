<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('email_settings', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->default('smtp'); // smtp, sendgrid, mailgun
            $table->string('from_email');
            $table->string('from_name');
            $table->string('smtp_host')->nullable();
            $table->integer('smtp_port')->default(587);
            $table->string('smtp_username')->nullable();
            $table->text('smtp_password')->nullable();
            $table->string('smtp_encryption')->default('tls');
            $table->text('api_key')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        Schema::create('email_logs', function (Blueprint $table) {
            $table->id();
            $table->string('recipient');
            $table->string('subject');
            $table->text('data')->nullable();
            $table->string('status')->default('pending'); // pending, sent, failed
            $table->text('error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
            
            $table->index('recipient');
            $table->index('status');
            $table->index('created_at');
        });

        Schema::create('offline_devices', function (Blueprint $table) {
            $table->id();
            $table->string('device_id')->unique();
            $table->string('device_name');
            $table->string('device_type'); // android, ios, windows, pos
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamp('last_sync_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index('device_id');
            $table->index('user_id');
        });

        Schema::create('offline_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->string('device_id');
            $table->string('sync_type'); // download, upload
            $table->string('entity_type'); // ticket, payment
            $table->unsignedBigInteger('entity_id');
            $table->string('offline_reference')->nullable();
            $table->json('data')->nullable();
            $table->string('status')->default('success');
            $table->text('error')->nullable();
            $table->timestamp('synced_at');
            $table->timestamps();
            
            $table->index('device_id');
            $table->index('synced_at');
            $table->index('offline_reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offline_sync_logs');
        Schema::dropIfExists('offline_devices');
        Schema::dropIfExists('email_logs');
        Schema::dropIfExists('email_settings');
    }
};
