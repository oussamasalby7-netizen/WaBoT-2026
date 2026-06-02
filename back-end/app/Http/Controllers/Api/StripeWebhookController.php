<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StripeWebhookController extends Controller
{
    /**
     * Verified Stripe webhooks: activate PRO, grant credits, extend billing period. Idempotent per Stripe object id.
     */
    public function handle(Request $request)
    {
        $secret = config('services.stripe.webhook_secret');
        if (empty($secret)) {
            Log::warning('Stripe webhook: STRIPE_WEBHOOK_SECRET is not set.');

            return response()->json([
                'status' => 'error',
                'message' => 'Webhook not configured',
            ], 503);
        }

        $payload = $request->getContent();
        $sigHeader = (string) $request->header('Stripe-Signature', '');

        try {
            $this->assertValidStripeSignature($payload, $sigHeader, $secret);
        } catch (\Throwable $e) {
            Log::notice('Stripe webhook: invalid signature', ['message' => $e->getMessage()]);

            return response()->json(['status' => 'error', 'message' => 'Invalid signature'], 400);
        }

        $event = json_decode($payload, true);
        if (! is_array($event) || empty($event['type'])) {
            return response()->json(['status' => 'error', 'message' => 'Invalid payload'], 400);
        }

        try {
            match ($event['type']) {
                'checkout.session.completed' => $this->handleCheckoutSessionCompleted($event),
                'invoice.paid' => $this->handleInvoicePaid($event),
                'invoice.payment_failed' => $this->handleInvoicePaymentFailed($event),
                default => null,
            };
        } catch (\Throwable $e) {
            Log::error('Stripe webhook processing failed', [
                'type' => $event['type'],
                'message' => $e->getMessage(),
            ]);

            return response()->json(['status' => 'error', 'message' => 'Processing failed'], 500);
        }

        return response()->json(['received' => true]);
    }

    private function handleCheckoutSessionCompleted(array $event): void
    {
        $obj = $event['data']['object'] ?? [];
        $sessionId = $obj['id'] ?? null;
        if (! $sessionId) {
            return;
        }

        $userId = data_get($obj, 'metadata.user_id');
        if (! $userId) {
            Log::info('Stripe checkout.session.completed without metadata.user_id', ['session' => $sessionId]);

            return;
        }

        $amountTotal = isset($obj['amount_total']) ? round(((float) $obj['amount_total']) / 100, 2) : 0.0;
        $currency = strtolower((string) ($obj['currency'] ?? 'usd'));

        $periodEndTs = data_get($obj, 'metadata.period_end');
        $billingDays = (int) data_get($obj, 'metadata.billing_period_days', 30);

        if ($periodEndTs) {
            $periodEnd = Carbon::createFromTimestamp((int) $periodEndTs);
        } else {
            $periodEnd = now()->addDays(max(1, $billingDays));
        }

        DB::transaction(function () use ($sessionId, $userId, $amountTotal, $currency, $periodEnd) {
            if (PaymentLog::query()->where('external_payment_id', $sessionId)->lockForUpdate()->exists()) {
                return;
            }

            $user = User::query()->whereKey($userId)->lockForUpdate()->first();
            if (! $user) {
                Log::warning('Stripe payment for missing user', ['user_id' => $userId, 'session' => $sessionId]);

                return;
            }

            PaymentLog::query()->create([
                'user_id' => $user->id,
                'external_payment_id' => $sessionId,
                'amount' => $amountTotal,
                'currency' => $currency,
                'provider' => 'stripe',
                'processed_at' => now(),
            ]);

            $user->refresh();
            $user->forceFill([
                'subscription_plan' => 'pro',
                'subscription_status' => 'pro',
                'subscription_period_end' => $periodEnd,
                'next_billing_at' => $periodEnd,
                'last_payment_at' => now(),
                'payment_failed_at' => null,
            ])->save();
        });
    }

    private function handleInvoicePaid(array $event): void
    {
        $obj = $event['data']['object'] ?? [];
        $invoiceId = $obj['id'] ?? null;
        if (! $invoiceId) {
            return;
        }

        if (PaymentLog::query()->where('external_payment_id', $invoiceId)->exists()) {
            return;
        }

        $userId = data_get($obj, 'metadata.user_id');
        if (! $userId) {
            Log::info('invoice.paid without metadata.user_id', ['invoice' => $invoiceId]);

            return;
        }

        $amount = isset($obj['amount_paid']) ? round(((float) $obj['amount_paid']) / 100, 2) : 0.0;
        $currency = strtolower((string) ($obj['currency'] ?? 'usd'));
        $linePeriodEnd = data_get($obj, 'lines.data.0.period.end');
        $periodEnd = $linePeriodEnd
            ? Carbon::createFromTimestamp((int) $linePeriodEnd)
            : now()->addMonth();

        DB::transaction(function () use ($invoiceId, $userId, $amount, $currency, $periodEnd) {
            if (PaymentLog::query()->where('external_payment_id', $invoiceId)->lockForUpdate()->exists()) {
                return;
            }

            $user = User::query()->whereKey($userId)->lockForUpdate()->first();
            if (! $user || $user->role === 'admin') {
                return;
            }

            PaymentLog::query()->create([
                'user_id' => $user->id,
                'external_payment_id' => $invoiceId,
                'amount' => $amount,
                'currency' => $currency,
                'provider' => 'stripe',
                'processed_at' => now(),
            ]);

            $user->refresh();
            $user->forceFill([
                'subscription_plan' => 'pro',
                'subscription_status' => 'pro',
                'subscription_period_end' => $periodEnd,
                'next_billing_at' => $periodEnd,
                'last_payment_at' => now(),
                'payment_failed_at' => null,
            ])->save();
        });
    }

    private function handleInvoicePaymentFailed(array $event): void
    {
        $obj = $event['data']['object'] ?? [];
        $userId = data_get($obj, 'metadata.user_id');
        if (! $userId) {
            return;
        }

        $user = User::query()->whereKey($userId)->first();
        if ($user && $user->role !== 'admin') {
            $user->payment_failed_at = now();
            $user->save();
        }
    }

    private function assertValidStripeSignature(string $payload, string $header, string $secret): void
    {
        if ($header === '') {
            throw new \RuntimeException('Missing Stripe-Signature header');
        }

        $timestamp = null;
        $signatures = [];
        foreach (explode(',', $header) as $part) {
            $part = trim($part);
            if (! str_contains($part, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $part, 2);
            if ($key === 't') {
                $timestamp = $value;
            }
            if ($key === 'v1') {
                $signatures[] = $value;
            }
        }

        if ($timestamp === null || $signatures === []) {
            throw new \RuntimeException('Malformed Stripe-Signature header');
        }

        if (abs(time() - (int) $timestamp) > 600) {
            throw new \RuntimeException('Timestamp outside tolerance');
        }

        $signedPayload = $timestamp.'.'.$payload;
        $expected = hash_hmac('sha256', $signedPayload, $secret);

        foreach ($signatures as $sig) {
            if (hash_equals($expected, $sig)) {
                return;
            }
        }

        throw new \RuntimeException('No matching v1 signature');
    }
}
