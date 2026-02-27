<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class TenantController extends Controller
{
    public function index(Request $request)
    {
        $query = Tenant::withCount(['users', 'businesses', 'transactions']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('subdomain', 'like', "%{$search}%")
                  ->orWhere('state', 'like', "%{$search}%");
            });
        }

        $tenants = $query->orderBy('created_at', 'desc')->get();

        // Add computed fields
        $tenants->each(function($tenant) {
            $tenant->total_revenue = $tenant->transactions()
                                           ->where('status', 'completed')
                                           ->sum('net_lga_amount');
            $tenant->platform_fees = $tenant->transactions()
                                           ->where('status', 'completed')
                                           ->sum('platform_fee');
        });

        return response()->json($tenants);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:tenants|max:255',
            'subdomain' => 'nullable|string|unique:tenants|max:255|alpha_dash',
            'logo_url' => 'nullable|url',
            'brand_color' => 'nullable|string|max:7',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'state' => 'nullable|string|max:100',
            'lga_code' => 'nullable|string|max:50',
            'revenue_share_model' => 'required|in:percentage,fixed',
            'share_value' => 'required|numeric|min:0',
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => 'required|min:8',
            'admin_phone' => 'nullable|string|max:20',
        ]);

        // Use subdomain if provided, otherwise use slug
        if (empty($validated['subdomain'])) {
            $validated['subdomain'] = $validated['slug'];
        }

        DB::beginTransaction();
        try {
            // Create tenant
            $tenant = Tenant::create([
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'subdomain' => $validated['subdomain'],
                'logo_url' => $validated['logo_url'] ?? null,
                'brand_color' => $validated['brand_color'] ?? '#3B82F6',
                'contact_email' => $validated['contact_email'] ?? null,
                'contact_phone' => $validated['contact_phone'] ?? null,
                'address' => $validated['address'] ?? null,
                'state' => $validated['state'] ?? null,
                'lga_code' => $validated['lga_code'] ?? null,
                'revenue_share_model' => $validated['revenue_share_model'],
                'share_value' => $validated['share_value'],
                'status' => 'active',
            ]);

            // Create tenant admin (chairman)
            $admin = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['admin_name'],
                'email' => $validated['admin_email'],
                'password' => Hash::make($validated['admin_password']),
                'phone' => $validated['admin_phone'] ?? null,
                'role' => 'chairman',
                'is_active' => true,
            ]);

            DB::commit();

            AuditLog::log(
                'create',
                'tenants',
                'Tenant',
                $tenant->id,
                [
                    'tenant_name' => $tenant->name,
                    'subdomain' => $tenant->subdomain,
                    'admin_email' => $admin->email,
                ]
            );

            $tenant->load('users');
            return response()->json([
                'tenant' => $tenant,
                'admin' => $admin,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create tenant: ' . $e->getMessage()], 500);
        }
    }

    public function show(Tenant $tenant)
    {
        $tenant->load(['users:id,tenant_id,name,email,role,is_active']);
        $tenant->loadCount(['users', 'businesses', 'transactions', 'wards']);
        
        // Get revenue stats
        $tenant->total_revenue = $tenant->transactions()
                                       ->where('status', 'completed')
                                       ->sum('net_lga_amount');
        $tenant->platform_fees = $tenant->transactions()
                                       ->where('status', 'completed')
                                       ->sum('platform_fee');

        return response()->json($tenant);
    }

    public function update(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'subdomain' => 'sometimes|string|unique:tenants,subdomain,' . $tenant->id . '|max:255|alpha_dash',
            'logo_url' => 'nullable|url',
            'brand_color' => 'nullable|string|max:7',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'state' => 'nullable|string|max:100',
            'lga_code' => 'nullable|string|max:50',
            'revenue_share_model' => 'sometimes|in:percentage,fixed',
            'share_value' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:active,suspended,inactive',
            'settings' => 'sometimes|array',
        ]);

        $oldValues = $tenant->toArray();
        $tenant->update($validated);

        AuditLog::log(
            'update',
            'tenants',
            'Tenant',
            $tenant->id,
            ['tenant_name' => $tenant->name],
            $oldValues,
            $tenant->fresh()->toArray()
        );

        return response()->json($tenant);
    }

    public function destroy(Tenant $tenant)
    {
        // Check if tenant has any transactions
        if ($tenant->transactions()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete tenant with transactions. Please suspend instead.',
            ], 422);
        }

        AuditLog::log(
            'delete',
            'tenants',
            'Tenant',
            $tenant->id,
            [
                'tenant_name' => $tenant->name,
                'users_count' => $tenant->users()->count(),
            ]
        );

        // Delete all related data
        $tenant->users()->delete();
        $tenant->wards()->delete();
        $tenant->departments()->delete();
        $tenant->businesses()->delete();
        $tenant->delete();

        return response()->json(['message' => 'Tenant deleted successfully']);
    }

    public function stats()
    {
        $stats = [
            'total_tenants' => Tenant::count(),
            'active_tenants' => Tenant::where('status', 'active')->count(),
            'suspended_tenants' => Tenant::where('status', 'suspended')->count(),
            'total_users' => User::whereNotNull('tenant_id')->count(),
            'total_platform_revenue' => \App\Models\Transaction::where('status', 'completed')->sum('platform_fee'),
            'total_lga_revenue' => \App\Models\Transaction::where('status', 'completed')->sum('net_lga_amount'),
            'by_state' => Tenant::selectRaw('state, count(*) as count')
                               ->whereNotNull('state')
                               ->groupBy('state')
                               ->pluck('count', 'state'),
            'recent_tenants' => Tenant::orderBy('created_at', 'desc')
                                     ->limit(5)
                                     ->get(['id', 'name', 'subdomain', 'status', 'created_at']),
        ];

        return response()->json($stats);
    }

    public function suspend(Tenant $tenant)
    {
        $tenant->update(['status' => 'suspended']);

        AuditLog::log(
            'suspend',
            'tenants',
            'Tenant',
            $tenant->id,
            ['tenant_name' => $tenant->name]
        );

        return response()->json(['message' => 'Tenant suspended', 'tenant' => $tenant]);
    }

    public function activate(Tenant $tenant)
    {
        $tenant->update(['status' => 'active']);

        AuditLog::log(
            'activate',
            'tenants',
            'Tenant',
            $tenant->id,
            ['tenant_name' => $tenant->name]
        );

        return response()->json(['message' => 'Tenant activated', 'tenant' => $tenant]);
    }

    public function updateRevenueShare(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'revenue_share_model' => 'required|in:percentage,fixed',
            'share_value' => 'required|numeric|min:0',
        ]);

        $oldModel = $tenant->revenue_share_model;
        $oldValue = $tenant->share_value;

        $tenant->update($validated);

        AuditLog::log(
            'update_revenue_share',
            'tenants',
            'Tenant',
            $tenant->id,
            ['tenant_name' => $tenant->name],
            ['model' => $oldModel, 'value' => $oldValue],
            ['model' => $tenant->revenue_share_model, 'value' => $tenant->share_value]
        );

        return response()->json(['message' => 'Revenue share updated', 'tenant' => $tenant]);
    }

    /**
     * Impersonate a tenant (enter tenant portal as super admin)
     * Platform admin gets FULL ACCESS to the tenant portal
     */
    public function impersonate(Tenant $tenant)
    {
        $platformUser = auth()->user();
        
        // Verify this is a platform admin
        if ($platformUser->tenant_id !== null) {
            return response()->json([
                'message' => 'Only platform admins can impersonate tenants',
            ], 403);
        }

        // Get the tenant's chairman (admin) user
        $tenantAdmin = User::where('tenant_id', $tenant->id)
            ->where('role', 'chairman')
            ->first();

        if (!$tenantAdmin) {
            return response()->json([
                'message' => 'No admin user found for this tenant',
            ], 404);
        }

        // Create impersonation session record
        $sessionId = \Illuminate\Support\Str::uuid();
        DB::table('impersonation_sessions')->insert([
            'id' => $sessionId,
            'platform_user_id' => $platformUser->id,
            'platform_user_email' => $platformUser->email,
            'tenant_id' => $tenant->id,
            'tenant_user_id' => $tenantAdmin->id,
            'started_at' => now(),
            'expires_at' => now()->addHours(4),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        // Generate impersonation token with extended abilities for platform admin
        $token = $tenantAdmin->createToken('impersonation-' . $sessionId, [
            '*', // Full access
            'impersonation:active',
        ], now()->addHours(4));

        AuditLog::log(
            'impersonate_start',
            'tenants',
            'Tenant',
            $tenant->id,
            [
                'tenant_name' => $tenant->name,
                'tenant_slug' => $tenant->slug,
                'impersonated_as' => $tenantAdmin->email,
                'platform_admin_id' => $platformUser->id,
                'platform_admin_email' => $platformUser->email,
                'session_id' => $sessionId,
            ]
        );

        return response()->json([
            'message' => 'Impersonation started - Full access granted',
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'subdomain' => $tenant->subdomain,
            ],
            'user' => [
                'id' => $tenantAdmin->id,
                'name' => $tenantAdmin->name,
                'email' => $tenantAdmin->email,
                'role' => $tenantAdmin->role,
                'tenant_id' => $tenant->id,
            ],
            'token' => $token->plainTextToken,
            'session_id' => $sessionId,
            'expires_at' => now()->addHours(4)->toISOString(),
            'is_impersonation' => true,
            'impersonator' => [
                'id' => $platformUser->id,
                'name' => $platformUser->name,
                'email' => $platformUser->email,
            ],
            'permissions' => [
                'full_access' => true,
                'can_modify_settings' => true,
                'can_view_financials' => true,
                'can_manage_users' => true,
                'restricted_actions' => [], // Platform admin has no restrictions
            ],
        ]);
    }

    /**
     * Exit impersonation session
     */
    public function exitImpersonation(Request $request)
    {
        $sessionId = $request->input('session_id');
        
        if ($sessionId) {
            // Mark session as ended
            DB::table('impersonation_sessions')
                ->where('id', $sessionId)
                ->update([
                    'ended_at' => now(),
                ]);

            AuditLog::log(
                'impersonate_end',
                'tenants',
                'ImpersonationSession',
                $sessionId,
                [
                    'ended_by' => auth()->user()->email ?? 'unknown',
                ]
            );
        }

        // Revoke the current token
        auth()->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Impersonation session ended',
            'redirect_to' => '/platform/tenants',
        ]);
    }
}
