<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Tenant;
use Symfony\Component\HttpFoundation\Response;

class TenantScope
{
    public function handle(Request $request, Closure $next): Response
    {
        if (auth()->check() && auth()->user()->tenant_id) {
            $tenantId = auth()->user()->tenant_id;
            
            config(['app.current_tenant_id' => $tenantId]);
            
            app()->instance('current_tenant_id', $tenantId);
        }

        return $next($request);
    }
}
