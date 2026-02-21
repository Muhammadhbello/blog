<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Tenant;
use App\Models\User;
use App\Models\RevenueCategory;
use App\Models\RevenueItem;
use App\Models\Ward;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $flexTenant = Tenant::create([
            'name' => 'FlexCloud Demo LGA',
            'slug' => 'demo-lga',
            'logo_url' => null,
            'brand_color' => '#3B82F6',
            'revenue_share_model' => 'percentage',
            'share_value' => 5.00,
            'status' => 'active',
        ]);

        User::create([
            'tenant_id' => null,
            'name' => 'Super Admin',
            'email' => 'admin@flexcloud.com',
            'password' => Hash::make('password123'),
            'role' => 'super_admin',
            'phone' => '+2348012345678',
            'is_active' => true,
        ]);

        $chairman = User::create([
            'tenant_id' => $flexTenant->id,
            'name' => 'Chairman Demo',
            'email' => 'chairman@demo-lga.gov',
            'password' => Hash::make('password123'),
            'role' => 'chairman',
            'phone' => '+2348012345679',
            'is_active' => true,
        ]);

        $treasurer = User::create([
            'tenant_id' => $flexTenant->id,
            'name' => 'Treasurer Demo',
            'email' => 'treasurer@demo-lga.gov',
            'password' => Hash::make('password123'),
            'role' => 'treasurer',
            'phone' => '+2348012345680',
            'is_active' => true,
        ]);

        $consultant = User::create([
            'tenant_id' => $flexTenant->id,
            'name' => 'Consultant Demo',
            'email' => 'consultant@demo-lga.gov',
            'password' => Hash::make('password123'),
            'role' => 'consultant',
            'phone' => '+2348012345681',
            'is_active' => true,
        ]);

        $collector = User::create([
            'tenant_id' => $flexTenant->id,
            'name' => 'Collector Demo',
            'email' => 'collector@demo-lga.gov',
            'password' => Hash::make('password123'),
            'role' => 'collector',
            'phone' => '+2348012345682',
            'is_active' => true,
        ]);

        $ward1 = Ward::create([
            'tenant_id' => $flexTenant->id,
            'name' => 'Central Ward',
            'code' => 'WRD001',
            'description' => 'Central business district',
        ]);

        $ward2 = Ward::create([
            'tenant_id' => $flexTenant->id,
            'name' => 'Industrial Ward',
            'code' => 'WRD002',
            'description' => 'Industrial area',
        ]);

        $marketCategory = RevenueCategory::create([
            'tenant_id' => $flexTenant->id,
            'name' => 'Market Levies',
            'code' => 'MKT',
        ]);

        $transportCategory = RevenueCategory::create([
            'tenant_id' => $flexTenant->id,
            'name' => 'Transport',
            'code' => 'TRP',
        ]);

        $licensingCategory = RevenueCategory::create([
            'tenant_id' => $flexTenant->id,
            'name' => 'Licensing & Permits',
            'code' => 'LIC',
        ]);

        RevenueItem::create([
            'tenant_id' => $flexTenant->id,
            'category_id' => $marketCategory->id,
            'name' => 'Daily Market Ticket',
            'type' => 'ticket',
            'frequency' => 'daily',
            'default_amount' => 200.00,
        ]);

        RevenueItem::create([
            'tenant_id' => $flexTenant->id,
            'category_id' => $transportCategory->id,
            'name' => 'Motor Park Ticket',
            'type' => 'ticket',
            'frequency' => 'daily',
            'default_amount' => 500.00,
        ]);

        RevenueItem::create([
            'tenant_id' => $flexTenant->id,
            'category_id' => $licensingCategory->id,
            'name' => 'Business Permit (Annual)',
            'type' => 'invoice',
            'frequency' => 'annual',
            'default_amount' => 50000.00,
        ]);

        $this->command->info('Database seeded successfully!');
    }
}
