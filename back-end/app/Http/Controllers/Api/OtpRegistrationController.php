<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OtpVerificationMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class OtpRegistrationController extends Controller
{
    private const OTP_EXPIRY_MINUTES = 10;
    private const MAX_ATTEMPTS       = 5;

    /**
     * Step 1: Validate registration data, generate OTP, store pending session in cache, send OTP email.
     * The user account is NOT created yet.
     */
    public function initiate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'                  => 'required|string|max:255',
            'email'                 => 'required|string|email|max:255|unique:users,email',
            'password'              => ['required', 'confirmed', Password::min(8)
                ->mixedCase()
                ->numbers()
                ->symbols()
                ->uncompromised(0)],
            'password_confirmation' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $email = strtolower(trim($request->email));

        // Generate a cryptographically secure 6-digit OTP
        $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        // Store pending registration data in cache (NOT in database)
        Cache::put("otp_reg:{$email}", [
            'name'       => $request->name,
            'email'      => $email,
            'password'   => Hash::make($request->password),   // pre-hashed for security
            'otp'        => $otp,
            'attempts'   => 0,
            'created_at' => now()->toIso8601String(),
        ], now()->addMinutes(self::OTP_EXPIRY_MINUTES));

        // Send OTP email
        Mail::to($email)->send(new OtpVerificationMail($otp, $request->name));

        return response()->json([
            'status'  => 'success',
            'message' => 'Verification code sent to your email address.',
            'data'    => [
                'email'      => $email,
                'expires_in' => self::OTP_EXPIRY_MINUTES,
            ],
        ]);
    }

    /**
     * Step 2: Verify the OTP. If correct, create the user account and return an access token.
     */
    public function verify(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp'   => 'required|string|size:6',
        ]);

        $email   = strtolower(trim($request->email));
        $cacheKey = "otp_reg:{$email}";
        $pending  = Cache::get($cacheKey);

        // Session expired
        if (! $pending) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Verification code has expired. Please register again.',
            ], 422);
        }

        // Brute-force protection
        if ($pending['attempts'] >= self::MAX_ATTEMPTS) {
            Cache::forget($cacheKey);
            return response()->json([
                'status'  => 'error',
                'message' => 'Too many failed attempts. Please start the registration again.',
            ], 429);
        }

        // Wrong OTP — increment counter and save back
        if ($pending['otp'] !== $request->otp) {
            $pending['attempts']++;
            Cache::put($cacheKey, $pending, now()->addMinutes(self::OTP_EXPIRY_MINUTES));

            $remaining = self::MAX_ATTEMPTS - $pending['attempts'];
            return response()->json([
                'status'    => 'error',
                'message'   => "Invalid verification code. {$remaining} attempt(s) remaining.",
                'remaining' => $remaining,
            ], 422);
        }

        // Guard against race condition: email registered while OTP was pending
        if (User::where('email', $email)->exists()) {
            Cache::forget($cacheKey);
            return response()->json([
                'status'  => 'error',
                'message' => 'This email address is already registered.',
            ], 409);
        }

        // Create the user account (mirrors existing AuthController::register logic)
        $user = User::create([
            'name'                => $pending['name'],
            'email'               => $pending['email'],
            'password'            => $pending['password'],   // already hashed
            'role'                => 'user',
            'subscription_status' => 'pending_payment',
            'subscription_plan'   => 'pro',
            'credits'             => 0,
            'locale'              => 'fr',
        ]);

        // Clean up the pending registration cache
        Cache::forget($cacheKey);

        // Return token so the frontend can log in automatically
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Account created successfully. Welcome to WaBoT!',
            'data'    => [
                'user'         => $user,
                'access_token' => $token,
                'token_type'   => 'Bearer',
            ],
        ], 201);
    }

    /**
     * Resend a fresh OTP (resets attempt counter and extends TTL).
     */
    public function resend(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $email    = strtolower(trim($request->email));
        $cacheKey = "otp_reg:{$email}";
        $pending  = Cache::get($cacheKey);

        if (! $pending) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Registration session has expired. Please start the registration again.',
            ], 422);
        }

        // Generate a new OTP and reset attempt counter
        $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        $pending['otp']      = $otp;
        $pending['attempts'] = 0;
        Cache::put($cacheKey, $pending, now()->addMinutes(self::OTP_EXPIRY_MINUTES));

        Mail::to($email)->send(new OtpVerificationMail($otp, $pending['name']));

        return response()->json([
            'status'  => 'success',
            'message' => 'A new verification code has been sent to your email.',
        ]);
    }
}
