<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'customer_number',
        'from_number',
        'body',
        'is_read',
        'whatsapp_message_id',
    ];

    /**
     * Get the business that owns the message.
     */
    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
