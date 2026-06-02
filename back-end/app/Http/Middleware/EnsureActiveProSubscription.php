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

        if (! $user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthenticated'], 401);
        }

        if ($user->role === 'admin') {
            return $next($request);
        }

        if ($user->is_blocked) {
            return response()->json([
                'status' => 'error',
                'message' => 'Your account is blocked.',
            ], 403);
        }

        if (! $user->hasActiveProSubscription()) {
            return response()->json([
                'status' => 'error',
                'code' => 'subscription_required',
                'message' => 'An active PRO subscription is required to use this service.',
            ], 403);
        }

        return $next($request);
    }
}
