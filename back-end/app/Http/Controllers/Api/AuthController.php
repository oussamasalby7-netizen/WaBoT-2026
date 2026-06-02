<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'user',
            'subscription_status' => 'pending_payment',
            'subscription_plan' => 'pro',
            'credits' => 0,
            'locale' => 'fr',
        ]);

        // Auto-create a default business for the user
        $user->business()->create([
            'name' => $request->name . '\'s Business',
            'description' => 'My new WaBoT store',
            'phone' => '0000000000',
            'whatsapp_phone_number_id' => 'setup-required-' . uniqid()
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'User registered successfully',
            'data' => [
                'user' => $user->load('business'),
                'access_token' => $token,
                'token_type' => 'Bearer',
            ]
        ], 201);
    }

    /**
     * Login user and create token.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid login credentials'
            ], 401);
        }

        $user = User::where('email', $request->email)->firstOrFail();

        if ($user->is_blocked) {
            Auth::logout();

            return response()->json([
                'status' => 'error',
                'message' => 'auth.blockedAccount'
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Logged in successfully',
            'data' => [
                'user' => $user->load('business'),
                'access_token' => $token,
                'token_type' => 'Bearer',
            ]
        ]);
    }

    /**
     * Logout user (Revoke token).
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Get the authenticated User.
     */
    public function profile(Request $request)
    {
        $user = $request->user();

        if ($user->is_blocked) {
            return response()->json([
                'status' => 'error',
                'message' => 'auth.blockedAccount'
            ], 403);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => $user->fresh('business'),
            ],
        ]);
    }

    /**
     * Persist UI locale / theme for authenticated user (sync with front-end localStorage).
     */
    public function updatePreferences(Request $request)
    {
        $validated = $request->validate([
            'locale' => 'sometimes|string|in:fr,en,ar',
            'theme_preference' => 'sometimes|string|in:dark,light',
        ]);

        if ($validated === []) {
            return response()->json([
                'status' => 'error',
                'message' => 'No valid preferences provided',
            ], 422);
        }

        $user = $request->user();
        $user->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Preferences saved',
            'data' => [
                'user' => $user->fresh('business'),
            ],
        ]);
    }

    /**
     * Update user email.
     */
    public function updateEmail(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email|max:255|unique:users,email,' . $request->user()->id,
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $request->user()->update(['email' => $request->email]);

        return response()->json([
            'status' => 'success',
            'message' => 'Email updated successfully',
        ]);
    }

    /**
     * Update user password.
     */
    public function updatePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Current password does not match nuestro records.'
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->password)
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Password updated successfully',
        ]);
    }
}
