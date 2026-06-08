<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_blocked' => 'boolean',
        'credits' => 'integer',
        'subscription_period_end' => 'datetime',
        'last_payment_at' => 'datetime',
        'next_billing_at' => 'datetime',
        'payment_failed_at' => 'datetime',
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'subscription_status',
        'is_blocked',
        'credits',
        'locale',
        'theme_preference',
        'subscription_plan',
        'subscription_period_end',
        'last_payment_at',
        'next_billing_at',
        'payment_failed_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'subscription_state',
    ];

    public function scopeActivePro(Builder $query): Builder
    {
        return $query
            ->where('subscription_plan', 'pro')
            ->whereNotNull('subscription_period_end')
            ->where('subscription_period_end', '>', now());
    }

    public function getSubscriptionStateAttribute(): string
    {
        if ($this->subscription_plan === 'pro' && $this->subscription_period_end instanceof Carbon) {
            return $this->subscription_period_end->isFuture() ? 'active' : 'expired';
        }

        return 'pending';
    }

    /**
     * Whether this account may use customer SaaS APIs (paid PRO, period valid).
     */
    public function hasActiveProSubscription(): bool
    {
        if ($this->role === 'admin') {
            return true;
        }

        return !$this->is_blocked
            && ($this->subscription_status === 'pro' || $this->subscription_plan === 'pro')
            && $this->subscription_period_end
            && $this->subscription_period_end->isFuture();
    }

    public function business()
    {
        return $this->hasOne(Business::class);
    }

    public function paymentLogs(): HasMany
    {
        return $this->hasMany(PaymentLog::class);
    }
}
