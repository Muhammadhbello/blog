<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('defaulters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->decimal('amount_due', 12, 2);
            $table->integer('days_overdue')->default(0);
            $table->timestamp('last_reminder_sent')->nullable();
            $table->integer('reminder_count')->default(0);
            $table->timestamps();
            
            $table->index(['tenant_id', 'days_overdue']);
            $table->index('business_id');
            $table->index('last_reminder_sent');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('defaulters');
    }
};
