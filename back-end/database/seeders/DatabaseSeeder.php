<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Business;
use App\Models\Product;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create demo and admin users
        User::updateOrCreate(
            ['email' => 'ejjoudmohamed0@gmail.com'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('Mohamed##EJJOUD1919'),
                'role' => 'admin',
                'subscription_status' => 'pro',
                'subscription_plan' => 'pro',
                'subscription_period_end' => now()->addYears(10),
                'next_billing_at' => now()->addYears(10),
                'is_blocked' => false,
            ]
        );

        $user = User::updateOrCreate(['email' => 'demo@wabot.com'], [
            'name' => 'Demo Merchant',
            'password' => bcrypt('password123'),
            'role' => 'user',
            'subscription_status' => 'pro',
            'subscription_plan' => 'pro',
            'subscription_period_end' => now()->addYear(),
            'next_billing_at' => now()->addMonth(),
            'last_payment_at' => now()->subWeek(),
            'is_blocked' => false,
            'credits' => 50,
        ]);

        User::updateOrCreate(
            ['email' => 'blocked@wabot.com'],
            [
                'name' => 'Blocked Merchant',
                'password' => bcrypt('password123'),
                'role' => 'user',
                'subscription_status' => 'pro',
                'subscription_plan' => 'pro',
                'subscription_period_end' => now()->addYear(),
                'next_billing_at' => now()->addMonth(),
                'last_payment_at' => now()->subWeek(),
                'is_blocked' => true,
            ]
        );


        // 2. Create a Business for the User
        $business = Business::updateOrCreate(
            ['user_id' => $user->id],
            [
                'name' => 'WaBoT Tech Shop',
                'description' => 'We sell the best AI gadgets and smart devices.',
                'phone' => '0612345678',
                'whatsapp_phone_number_id' => '99999' // THIS IS YOUR TEST ID
            ]
        );

        // 3. Create some products for the business
        Product::updateOrCreate(
            ['business_id' => $business->id, 'name' => 'AI Smart Watch'],
            ['price' => 450, 'stock' => 10]
        );

        Product::updateOrCreate(
            ['business_id' => $business->id, 'name' => 'Wireless AI Headphones'],
            ['price' => 1200, 'stock' => 5]
        );

        $this->command->info('✅ Test Data Seeded Successfully!');
        $this->command->info('👉 Test URL: http://localhost:8000/api/webhook/99999');
    }
}
