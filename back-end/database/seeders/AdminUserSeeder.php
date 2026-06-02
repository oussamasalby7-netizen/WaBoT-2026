<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Seed the default admin user.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Administrator',
                'email' => 'admin@example.com',
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'subscription_status' => 'pro',
                'subscription_plan' => 'pro',
                'subscription_period_end' => now()->addYears(10),
                'next_billing_at' => now()->addYears(10),
                'is_blocked' => false,
            ]
        );

        $this->command->info(' Admin user seeded successfully!');
        $this->command->info(' Email: admin@example.com');
        $this->command->info('Password: password123');
    }
}
