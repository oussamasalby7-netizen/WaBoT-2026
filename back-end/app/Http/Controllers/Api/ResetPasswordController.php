<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class ResetPasswordController extends Controller
{
    /**
     * Reset the user's password using Laravel's built-in Password Broker.
     */
    public function reset(Request $request)
    {
        $request->validate([
            'token'                 => 'required|string',
            'email'                 => 'required|email',
            'password'              => 'required|string|min:8|confirmed',
            'password_confirmation' => 'required|string',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, string $password) {
                $user->forceFill([
                    'password'       => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'status'  => 'success',
                'message' => 'Password has been reset successfully.',
            ]);
        }

        return response()->json([
            'status'  => 'error',
            'message' => match ($status) {
                Password::INVALID_TOKEN => 'This password reset link is invalid or has expired.',
                Password::INVALID_USER  => 'We could not find a user with that email address.',
                default                 => 'Failed to reset password. Please request a new link.',
            },
        ], 422);
    }
}
