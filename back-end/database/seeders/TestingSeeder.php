<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\Message;
use App\Models\Order;
use App\Models\PaymentLog;
use App\Models\Product;
use App\Models\SupportMessage;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TestingSeeder extends Seeder
{
    public function run(): void
    {
        // Designed for an isolated TEST database only.
        // Use: php artisan migrate:fresh --seed --seeder=TestingSeeder --env=testing

        // Admin
        User::updateOrCreate(
            ['email' => 'ejjoudmohamed0@gmail.com'],
            [
                'name' => 'Test Admin',
                'password' => bcrypt('Mohamed##EJJOUD1919'),
                'role' => 'admin',
                'subscription_status' => 'pro',
                'subscription_plan' => 'pro',
                'subscription_period_end' => now()->addYears(10),
                'next_billing_at' => now()->addYears(10),
                'is_blocked' => false,
            ]
        );

        $fake = fake();

        // Create 12 customers across different subscription states
        $users = collect();
        for ($i = 0; $i < 12; $i++) {
            $email = $fake->unique()->safeEmail();
            $name = $fake->name();

            $stateRoll = $i % 3; // 0 active, 1 expired, 2 pending
            $periodEnd = null;
            $plan = 'free';
            $status = 'pending';
            $lastPaymentAt = null;

            if ($stateRoll === 0) {
                $plan = 'pro';
                $status = 'pro';
                $periodEnd = now()->addDays($fake->numberBetween(1, 25));
                $lastPaymentAt = now()->subDays($fake->numberBetween(0, 20));
            } elseif ($stateRoll === 1) {
                $plan = 'pro';
                $status = 'expired';
                $periodEnd = now()->subDays($fake->numberBetween(1, 45));
                $lastPaymentAt = now()->subDays($fake->numberBetween(31, 80));
            }

            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => bcrypt('password123'),
                'role' => 'user',
                'subscription_status' => $status,
                'subscription_plan' => $plan,
                'subscription_period_end' => $periodEnd,
                'next_billing_at' => $periodEnd,
                'last_payment_at' => $lastPaymentAt,
                'is_blocked' => false,
                'credits' => $fake->numberBetween(0, 200),
                'locale' => 'fr',
            ]);

            $users->push($user);
        }

        // Businesses + products + conversation samples
        $users->each(function (User $user, int $idx) use ($fake) {
            $phoneId = 'TEST_' . str_pad((string) ($idx + 1), 4, '0', STR_PAD_LEFT);
            $business = Business::create([
                'user_id' => $user->id,
                'name' => $fake->company() . ' Shop',
                'description' => $fake->sentence(12),
                'phone' => $fake->numerify('06#######'),
                'whatsapp_phone_number_id' => $phoneId,
            ]);

            $products = [
                ['name' => 'Smart Watch', 'price' => 450, 'stock' => 10],
                ['name' => 'Wireless Headphones', 'price' => 1200, 'stock' => 5],
                ['name' => 'AI Camera', 'price' => 900, 'stock' => 3],
            ];

            foreach ($products as $p) {
                Product::create([
                    'business_id' => $business->id,
                    'name' => $p['name'],
                    'price' => $p['price'],
                    'stock' => $p['stock'],
                    'description' => $fake->sentence(10),
                ]);
            }

            // Fake conversation thread
            $customerNumber = $fake->numerify('2126#######');
            $msgId = 'TESTMSG_' . Str::random(10);
            $in = Message::create([
                'business_id' => $business->id,
                'customer_number' => $customerNumber,
                'from_number' => $customerNumber,
                'body' => 'Salam, wach kayn smart watch?',
                'whatsapp_message_id' => $msgId,
            ]);
            Message::create([
                'business_id' => $business->id,
                'customer_number' => $customerNumber,
                'from_number' => 'AI_ASSISTANT',
                'body' => 'Salam! Oui kayn. Bghiti ch7al men wa7d? w fin ghadi ntsiftou?',
                'whatsapp_message_id' => 'AI_' . $msgId,
            ]);

            // Optional order seeded for some users
            if ($idx % 4 === 0) {
                Order::create([
                    'business_id' => $business->id,
                    'message_id' => $in->id,
                    'customer_name' => $fake->name(),
                    'customer_address' => $fake->address(),
                    'product_name' => 'Smart Watch',
                    'quantity' => 1,
                    'total_price' => 450,
                    'status' => 'pending',
                ]);
            }
        });

        // Payment logs (simulate 12 months of activations, amount = 50)
        $users->each(function (User $user) use ($fake) {
            // only some users have payments
            if ($fake->boolean(65)) {
                $count = $fake->numberBetween(1, 3);
                for ($i = 0; $i < $count; $i++) {
                    $dt = Carbon::now()->subMonths($fake->numberBetween(0, 11))->subDays($fake->numberBetween(0, 27));
                    PaymentLog::query()->firstOrCreate(
                        ['external_payment_id' => 'seed_' . $user->id . '_' . $dt->timestamp . '_' . $i],
                        [
                            'user_id' => $user->id,
                            'amount' => 50.00,
                            'currency' => 'usd',
                            'provider' => 'seed',
                            'processed_at' => $dt,
                        ]
                    );
                }
            }
        });

        // Support messages
        foreach ($users->take(8) as $u) {
            SupportMessage::create([
                'user_id' => $u->id,
                'email' => $u->email,
                'phone' => $fake->numerify('06#######'),
                'message' => $fake->paragraphs($fake->numberBetween(1, 2), true),
                'is_read' => $fake->boolean(40),
                'read_at' => null,
                'is_replied' => $fake->boolean(20),
                'replied_at' => null,
            ]);
        }

        $this->command?->info('✅ TestingSeeder complete (TEST database).');
        $this->command?->info('Admin login: ejjoudmohamed0@gmail.com / [protected]');
    }
}

