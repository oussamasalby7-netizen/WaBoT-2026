<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Business extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'phone',
        'whatsapp_phone_number_id',
    ];

    /**
     * Get the user that owns the business.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the products for the business.
     */
    public function products()
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Get the orders for the business.
     */
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Get the WhatsApp messages for the business.
     */
    public function messages()
    {
        return $this->hasMany(Message::class);
    }
}
