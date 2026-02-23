<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('registration_number')->unique()->nullable();
            $table->string('owner_name');
            $table->string('owner_phone');
            $table->string('owner_email')->nullable();
            $table->text('address')->nullable();
            $table->foreignId('ward_id')->constrained()->onDelete('cascade');
            $table->foreignId('department_id')->constrained()->onDelete('cascade');
            
            // Business categorization
            $table->enum('business_size', ['small', 'medium', 'enterprise'])->default('small');
            $table->enum('business_category', [
                'fuel_station', 'school', 'hospital_clinic', 'bank', 
                'hotel_guest_inn', 'telecom_mast', 'retail', 'wholesale',
                'manufacturing', 'services', 'food_beverage', 'transport', 'other'
            ])->default('retail');
            $table->string('business_sub_category')->nullable(); // e.g., 'primary', 'secondary', 'tertiary' for schools
            
            // Virtual account details
            $table->string('virtual_account_number')->nullable();
            $table->string('virtual_account_name')->nullable();
            $table->string('virtual_account_bank')->nullable();
            $table->string('virtual_account_reference')->nullable();
            
            // Business user credentials (for portal access)
            $table->string('portal_email')->nullable()->unique();
            $table->string('portal_password')->nullable();
            $table->boolean('portal_enabled')->default(false);
            
            $table->foreignId('registered_by')->nullable();
            $table->enum('status', ['active', 'inactive', 'suspended', 'pending'])->default('active');
            $table->timestamps();
            
            $table->index(['ward_id', 'business_category']);
            $table->index(['business_size', 'status']);
            $table->index(['registered_by']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('businesses');
    }
};
