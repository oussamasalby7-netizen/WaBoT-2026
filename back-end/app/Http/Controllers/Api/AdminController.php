<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentLog;
use App\Models\SubscriptionStatusChange;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Users with subscription state derived from plan + period end.
     */
    public function index(Request $request)
    {
        $state = $request->query('subscription_state');

        $users = User::query()
            ->where('role', 'user')
            ->with('business')
            ->when(
                in_array($state, ['active', 'pending', 'expired'], true),
                fn (Builder $query) => $this->applySubscriptionStateFilter($query, $state)
            )
            ->orderByDesc('last_payment_at')
            ->orderBy('email')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $users,
        ]);
    }

    /**
     * Support/compliance: adjust the PRO subscription period.
     */
    public function updateSubscription(Request $request, $id)
    {
        $request->validate([
            'subscription_state' => 'required|string|in:pending,active,expired',
            'subscription_period_end' => 'nullable|date',
            'next_billing_at' => 'nullable|date',
        ]);

        $user = User::findOrFail($id);

        if ($user->role === 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot change subscription for an administrator via this endpoint',
            ], 403);
        }

        $subscriptionState = $request->subscription_state;
        $fromStatus = (string) ($user->subscription_state ?? 'pending');

        DB::transaction(function () use ($request, $user, $subscriptionState) {
            if ($subscriptionState === 'active') {
                $base = ($user->subscription_period_end && $user->subscription_period_end->isFuture())
                    ? $user->subscription_period_end
                    : now();

                $periodEnd = $base->copy()->addDays(30);

                $user->forceFill([
                    'subscription_status' => 'pro',
                    'subscription_plan' => 'pro',
                    'subscription_period_end' => $periodEnd,
                    'next_billing_at' => $periodEnd,
                    'last_payment_at' => now(),
                    'payment_failed_at' => null,
                ])->save();

                // CRITICAL BUSINESS RULE:
                // Payment = company earnings only (never user credits). Create exactly one revenue entry per activation.
                $externalId = 'admin_activation:user='.$user->id.':period_end='.$periodEnd->timestamp;
                PaymentLog::query()->firstOrCreate(
                    ['external_payment_id' => $externalId],
                    [
                        'user_id' => $user->id,
                        'amount' => 50.00,
                        'currency' => 'usd',
                        'provider' => 'admin',
                        'processed_at' => now(),
                    ]
                );

                return;
            }

            if ($subscriptionState === 'expired') {
                $user->forceFill([
                    'subscription_status' => 'expired',
                    'subscription_period_end' => now()->subSecond(),
                    'next_billing_at' => null,
                ])->save();

                return;
            }

            $user->forceFill([
                'subscription_status' => 'pending',
                'subscription_period_end' => null,
                'next_billing_at' => null,
            ])->save();
        });

        $user->refresh();
        $toStatus = (string) ($user->subscription_state ?? 'pending');
        if ($fromStatus !== $toStatus) {
            SubscriptionStatusChange::query()->create([
                'user_id' => $user->id,
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Subscription updated',
            'data' => $user->fresh(),
        ]);
    }

    public function toggleBlock(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($user->role === 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot block an administrator',
            ], 403);
        }

        $user->update([
            'is_blocked' => ! $user->is_blocked,
        ]);

        $status = $user->is_blocked ? 'blocked' : 'unblocked';

        return response()->json([
            'status' => 'success',
            'message' => "User has been {$status}",
            'data' => $user,
        ]);
    }

    /**
     * KPIs from database only (payment_logs + users).
     */
    public function getSaaSStats()
    {
        $now = now();

        $totalUsers = User::where('role', 'user')->count();

        $activeProSubscribers = User::query()
            ->where('role', 'user')
            ->activePro()
            ->count();

        $expiredSubscribers = User::query()
            ->where('role', 'user')
            ->where('subscription_plan', 'pro')
            ->whereNotNull('subscription_period_end')
            ->where('subscription_period_end', '<=', $now)
            ->count();

        $pendingSubscribers = max(0, $totalUsers - $activeProSubscribers - $expiredSubscribers);

        $monthlyRevenue = (float) PaymentLog::query()
            ->whereNotNull('processed_at')
            ->whereYear('processed_at', Carbon::now()->year)
            ->whereMonth('processed_at', Carbon::now()->month)
            ->sum('amount');

        $paidUsersThisMonth = (int) PaymentLog::query()
            ->whereNotNull('processed_at')
            ->whereYear('processed_at', Carbon::now()->year)
            ->whereMonth('processed_at', Carbon::now()->month)
            ->distinct('user_id')
            ->count('user_id');

        $totalRevenueAllTime = (float) PaymentLog::query()
            ->whereNotNull('processed_at')
            ->sum('amount');

        $totalCreditsAdded = (int) User::query()
            ->where('role', 'user')
            ->sum('credits');

        $failedPaymentsRecent = User::query()
            ->where('role', 'user')
            ->whereNotNull('payment_failed_at')
            ->where('payment_failed_at', '>=', now()->subDays(90))
            ->count();

        $newUsersThisMonth = User::whereYear('created_at', Carbon::now()->year)
            ->whereMonth('created_at', Carbon::now()->month)
            ->where('role', 'user')
            ->count();

        $startLastMonth = Carbon::now()->subMonthNoOverflow()->startOfMonth();
        $endLastMonth = Carbon::now()->subMonthNoOverflow()->endOfMonth();
        $newUsersLastMonth = User::whereBetween('created_at', [$startLastMonth, $endLastMonth])
            ->where('role', 'user')
            ->count();

        $growthPercent = $newUsersLastMonth > 0
            ? round((($newUsersThisMonth - $newUsersLastMonth) / $newUsersLastMonth) * 100, 1)
            : ($newUsersThisMonth > 0 ? 100.0 : 0.0);

        $userGrowthTrend = 'flat';
        if ($newUsersThisMonth > $newUsersLastMonth) {
            $userGrowthTrend = 'up';
        } elseif ($newUsersThisMonth < $newUsersLastMonth) {
            $userGrowthTrend = 'down';
        }

        $revenueByMonth = [];
        for ($i = 11; $i >= 0; $i--) {
            $m = Carbon::now()->subMonths($i)->startOfMonth();
            $total = (float) PaymentLog::query()
                ->whereNotNull('processed_at')
                ->whereBetween('processed_at', [$m->copy()->startOfMonth(), $m->copy()->endOfMonth()])
                ->sum('amount');
            $revenueByMonth[] = [
                'month' => $m->format('M Y'),
                'revenue' => round($total, 2),
            ];
        }

        $subscriptionBreakdown = [
            'active' => $activeProSubscribers,
            'pending' => $pendingSubscribers,
            'expired' => $expiredSubscribers,
        ];

        $churnWindow = Carbon::now()->subDays(30);
        $churnedUsersLast30 = User::query()
            ->where('role', 'user')
            ->where('subscription_plan', 'pro')
            ->whereBetween('subscription_period_end', [$churnWindow, $now])
            ->count();

        $churnDenominator = max(1, $activeProSubscribers + $churnedUsersLast30);
        $churnRatePercent = round(($churnedUsersLast30 / $churnDenominator) * 100, 2);

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_users' => $totalUsers,
                'active_pro_subscribers' => $activeProSubscribers,
                'pending_subscribers' => $pendingSubscribers,
                'expired_subscribers' => $expiredSubscribers,
                'paid_users' => $activeProSubscribers,
                'paid_users_this_month' => $paidUsersThisMonth,
                'unpaid_users' => $pendingSubscribers + $expiredSubscribers,
                'monthly_revenue' => round($monthlyRevenue, 2),
                'total_revenue_all_time' => round($totalRevenueAllTime, 2),
                'total_credits_added' => $totalCreditsAdded,
                'failed_payments_recent' => $failedPaymentsRecent,
                'revenue_by_month' => $revenueByMonth,
                'subscription_breakdown' => $subscriptionBreakdown,
                'churn_rate_percent' => $churnRatePercent,
                'churned_users_last_30d' => $churnedUsersLast30,
                'user_growth_trend' => $userGrowthTrend,
                'user_growth_percent' => $growthPercent,
                'new_users_this_month' => $newUsersThisMonth,
                'new_users_last_month' => $newUsersLastMonth,
            ],
        ]);
    }

    private function applySubscriptionStateFilter(Builder $query, string $state): Builder
    {
        if ($state === 'active') {
            return $query->activePro();
        }

        if ($state === 'expired') {
            return $query
                ->where('subscription_plan', 'pro')
                ->whereNotNull('subscription_period_end')
                ->where('subscription_period_end', '<=', now());
        }

        return $query->where(function (Builder $query) {
            $query
                ->whereNull('subscription_plan')
                ->orWhere('subscription_plan', '!=', 'pro')
                ->orWhereNull('subscription_period_end');
        });
    }

    public function deleteUser($id)
    {
        $user = User::findOrFail($id);

        if ($user->role === 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot delete an administrator',
            ], 403);
        }

        $userName = $user->name;
        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => "User {$userName} has been permanently deleted",
        ]);
    }
}
