<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'name',
        'price',
        'description',
        'stock',
    ];

    /**
     * Get the business that owns the product.
     */
    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
