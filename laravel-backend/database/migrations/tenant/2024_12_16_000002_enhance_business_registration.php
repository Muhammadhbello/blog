<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Business categories with hierarchy
        Schema::create('business_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 20)->unique();
            $table->text('description')->nullable();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->integer('level')->default(0); // 0 = root, 1 = subcategory
            $table->boolean('requires_subcategory')->default(false);
            $table->json('size_tariffs')->nullable(); // {"small": 5000, "medium": 10000, "large": 20000}
            $table->string('status')->default('active');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            $table->index('parent_id');
            $table->index('status');
        });

        // Business sizes configuration
        Schema::create('business_sizes', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Small, Medium, Large, Enterprise
            $table->string('code', 20)->unique();
            $table->text('description')->nullable();
            $table->json('criteria')->nullable(); // {"min_employees": 1, "max_employees": 10, "min_revenue": 0}
            $table->decimal('default_multiplier', 5, 2)->default(1.00);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Add new columns to businesses table
        Schema::table('businesses', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('business_type');
            $table->foreignId('subcategory_id')->nullable()->after('category_id');
            $table->foreignId('size_id')->nullable()->after('size');
            $table->integer('employee_count')->nullable()->after('size_id');
            $table->decimal('annual_revenue', 15, 2)->nullable()->after('employee_count');
            $table->string('tax_id')->nullable()->after('registration_number');
            $table->json('documents')->nullable(); // Uploaded docs
            $table->json('operating_hours')->nullable();
            $table->date('license_expiry')->nullable();
            $table->string('license_status')->default('pending'); // pending, valid, expired
            $table->timestamp('last_inspection_at')->nullable();
            $table->text('inspection_notes')->nullable();
            
            $table->index('category_id');
            $table->index('size_id');
            $table->index('license_status');
        });

        // Business history/changelog
        Schema::create('business_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable();
            $table->string('action'); // created, updated, size_changed, category_changed, suspended
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index('business_id');
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_history');
        
        Schema::table('businesses', function (Blueprint $table) {
            $table->dropColumn([
                'category_id', 'subcategory_id', 'size_id', 
                'employee_count', 'annual_revenue', 'tax_id',
                'documents', 'operating_hours', 'license_expiry',
                'license_status', 'last_inspection_at', 'inspection_notes'
            ]);
        });
        
        Schema::dropIfExists('business_sizes');
        Schema::dropIfExists('business_categories');
    }
};
