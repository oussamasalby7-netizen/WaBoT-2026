<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

class ForgotPasswordController extends Controller
{
    /**
     * Send a password reset link to the given user.
     * The link points to the React SPA frontend, not to Laravel.
     */
    public function sendLink(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // Override the default reset URL to point to the React frontend
        ResetPasswordNotification::createUrlUsing(function ($notifiable, string $token) {
            $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
            $email = urlencode($notifiable->getEmailForPasswordReset());
            return "{$frontendUrl}/reset-password?token={$token}&email={$email}";
        });

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json([
                'status'  => 'success',
                'message' => 'Password reset link sent to your email address.',
            ]);
        }

        // Return a vague error to avoid email enumeration
        return response()->json([
            'status'  => 'error',
            'message' => 'If this email exists, a reset link has been sent.',
        ], 422);
    }
}
