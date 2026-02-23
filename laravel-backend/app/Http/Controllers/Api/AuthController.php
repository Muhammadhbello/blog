<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'login_type' => 'nullable|in:user,business,consultant',
        ]);

        $loginType = $request->login_type ?? 'user';

        // Handle different login types
        if ($loginType === 'business') {
            return $this->businessLogin($request);
        }

        if ($loginType === 'consultant') {
            return $this->consultantLogin($request);
        }

        // Default: Regular user login
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Account is inactive'], 403);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'tenant_id' => $user->tenant_id,
                'tenant' => $user->tenant,
            ],
            'token' => $token,
            'login_type' => 'user',
        ]);
    }

    protected function businessLogin(Request $request)
    {
        // Business login via tenant database
        $business = DB::connection('tenant')
            ->table('businesses')
            ->where('owner_email', $request->email)
            ->first();

        if (!$business) {
            throw ValidationException::withMessages([
                'email' => ['No business found with this email.'],
            ]);
        }

        if (!$business->hashed_password || !Hash::check($request->password, $business->hashed_password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($business->status !== 'active') {
            return response()->json(['message' => 'Business account is not active'], 403);
        }

        // Create a pseudo user for token generation
        $user = new User([
            'id' => $business->id,
            'name' => $business->owner_name,
            'email' => $business->owner_email,
            'role' => 'business_user',
        ]);
        $user->id = 'business_' . $business->id;

        // Use business ID for token
        $token = $user->createToken('business-auth-token')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => 'business_' . $business->id,
                'business_id' => $business->id,
                'name' => $business->owner_name,
                'email' => $business->owner_email,
                'role' => 'business_user',
                'business_name' => $business->business_name,
                'registration_number' => $business->registration_number,
            ],
            'token' => $token,
            'login_type' => 'business',
        ]);
    }

    protected function consultantLogin(Request $request)
    {
        // Consultant login via tenant database
        $consultant = DB::connection('tenant')
            ->table('consultants')
            ->where('email', $request->email)
            ->first();

        if (!$consultant) {
            throw ValidationException::withMessages([
                'email' => ['No consultant found with this email.'],
            ]);
        }

        if (!$consultant->hashed_password || !Hash::check($request->password, $consultant->hashed_password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$consultant->is_active) {
            return response()->json(['message' => 'Consultant account is not active'], 403);
        }

        $user = new User([
            'id' => $consultant->id,
            'name' => $consultant->name,
            'email' => $consultant->email,
            'role' => 'consultant',
        ]);
        $user->id = 'consultant_' . $consultant->id;

        $token = $user->createToken('consultant-auth-token')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => 'consultant_' . $consultant->id,
                'consultant_id' => $consultant->id,
                'name' => $consultant->name,
                'email' => $consultant->email,
                'role' => 'consultant',
                'company_name' => $consultant->company_name,
            ],
            'token' => $token,
            'login_type' => 'consultant',
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'role' => $request->user()->role,
                'tenant_id' => $request->user()->tenant_id,
                'tenant' => $request->user()->tenant,
            ],
        ]);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8',
            'phone' => 'nullable|string',
            'role' => 'required|in:chairman,treasurer,hod,consultant,collector,citizen',
            'tenant_id' => 'required|exists:tenants,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'tenant_id' => $validated['tenant_id'],
            'is_active' => true,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }
}
