<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'message_id',
        'customer_name',
        'customer_address',
        'customer_phone',
        'product_name',
        'quantity',
        'total_price',
        'status',
    ];

    /**
     * Get the business that owns the order.
     */
    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    /**
     * Get the message associated with the order.
     */
    public function message()
    {
        return $this->belongsTo(Message::class);
    }
}
