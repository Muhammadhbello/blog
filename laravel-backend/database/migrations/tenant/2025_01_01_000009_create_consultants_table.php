<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('phone');
            $table->enum('type', ['individual', 'company', 'internal_supervisor'])->default('individual');
            $table->string('company_name')->nullable();
            $table->string('company_rc_number')->nullable();
            $table->text('address')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('bank_account_number')->nullable();
            $table->string('bank_account_name')->nullable();
            $table->decimal('commission_rate', 5, 2)->default(0); // percentage
            $table->decimal('wallet_balance', 12, 2)->default(0);
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
        });

        Schema::create('consultant_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultant_id')->constrained()->onDelete('cascade');
            $table->foreignId('revenue_point_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('revenue_item_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('ward_id')->nullable()->constrained()->onDelete('cascade');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->enum('status', ['active', 'inactive', 'completed'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['consultant_id', 'status']);
            $table->index(['revenue_point_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultant_assignments');
        Schema::dropIfExists('consultants');
    }
};
