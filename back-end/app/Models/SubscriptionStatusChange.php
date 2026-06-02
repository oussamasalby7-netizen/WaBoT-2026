<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionStatusChange extends Model
{
    protected $fillable = [
        'user_id',
        'from_status',
        'to_status',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
