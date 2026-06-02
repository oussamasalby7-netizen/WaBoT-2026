<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $columnsToAdd = [
            'subscription_plan' => ! Schema::hasColumn('users', 'subscription_plan'),
            'subscription_period_end' => ! Schema::hasColumn('users', 'subscription_period_end'),
            'last_payment_at' => ! Schema::hasColumn('users', 'last_payment_at'),
            'next_billing_at' => ! Schema::hasColumn('users', 'next_billing_at'),
            'payment_failed_at' => ! Schema::hasColumn('users', 'payment_failed_at'),
        ];

        if (in_array(true, $columnsToAdd, true)) {
            Schema::table('users', function (Blueprint $table) use ($columnsToAdd) {
                if ($columnsToAdd['subscription_plan']) {
                    $table->string('subscription_plan', 32)->default('pro');
                }

                if ($columnsToAdd['subscription_period_end']) {
                    $table->timestamp('subscription_period_end')->nullable();
                }

                if ($columnsToAdd['last_payment_at']) {
                    $table->timestamp('last_payment_at')->nullable();
                }

                if ($columnsToAdd['next_billing_at']) {
                    $table->timestamp('next_billing_at')->nullable();
                }

                if ($columnsToAdd['payment_failed_at']) {
                    $table->timestamp('payment_failed_at')->nullable();
                }
            });
        }

        // Legacy paid statuses become active PRO by setting a future period end.
        DB::table('users')->where('role', 'admin')->update([
    'subscription_plan' => 'pro',
    'subscription_period_end' => now()->addMonth(),
    'next_billing_at' => now()->addMonth(),
]);

        DB::table('users')->where('role', '!=', 'admin')->whereIn('subscription_status', ['pro', 'enterprise'])->update([
            'subscription_plan' => 'pro',
        ]);

        DB::table('users')->where('role', '!=', 'admin')->where('subscription_status', 'free')->update([
            'subscription_plan' => 'pro',
        ]);

        DB::table('users')
            ->where('role', '!=', 'admin')
            ->whereIn('subscription_status', ['pro', 'enterprise'])
            ->whereNull('subscription_period_end')
            ->update([
                'subscription_period_end' => now()->addYear(),
                'next_billing_at' => now()->addMonth(),
                'last_payment_at' => now()->subDay(),
            ]);

        DB::table('users')
            ->where('subscription_plan', 'pro')
            ->whereNotNull('subscription_period_end')
            ->whereNull('next_billing_at')
            ->update([
                'next_billing_at' => DB::raw('subscription_period_end'),
            ]);
    }

    public function down(): void
    {
        $columnsToDrop = array_values(array_filter([
            'subscription_plan',
            'subscription_period_end',
            'last_payment_at',
            'next_billing_at',
            'payment_failed_at',
        ], fn (string $column) => Schema::hasColumn('users', $column)));

        if ($columnsToDrop !== []) {
            Schema::table('users', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }
    }
};
