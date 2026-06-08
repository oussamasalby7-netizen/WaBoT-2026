<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveProSubscription
{
    /**
     * Block SaaS API usage unless the user has an active paid PRO subscription (period not expired).
     * Administrators bypass this check.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $response = null;

        if (! $user) {
            $response = response()->json(['status' => 'error', 'message' => 'Unauthenticated'], 401);
        } elseif ($user->role !== 'admin') {
            if ($user->is_blocked) {
                $response = response()->json([
                    'status' => 'error',
                    'message' => 'Your account is blocked.',
                ], 403);
            } elseif (! $user->hasActiveProSubscription()) {
                $response = response()->json([
                    'status' => 'error',
                    'code' => 'subscription_required',
                    'message' => 'An active PRO subscription is required to use this service.',
                ], 403);
            }
        }

        return $response ?: $next($request);
    }
}
