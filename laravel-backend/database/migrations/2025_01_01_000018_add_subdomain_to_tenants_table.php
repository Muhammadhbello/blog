<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('subdomain')->unique()->nullable()->after('slug');
            $table->string('contact_email')->nullable()->after('brand_color');
            $table->string('contact_phone')->nullable()->after('contact_email');
            $table->text('address')->nullable()->after('contact_phone');
            $table->string('state')->nullable()->after('address');
            $table->string('lga_code')->nullable()->after('state');
            $table->json('settings')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['subdomain', 'contact_email', 'contact_phone', 'address', 'state', 'lga_code', 'settings']);
        });
    }
};
