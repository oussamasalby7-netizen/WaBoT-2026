<?php

namespace App\Services;

use App\Models\Business;

class OrderDataNormalizer
{
    /**
     * Normalize AI tool output for persistence and stock lookup.
     *
     * @param  array<string, mixed>  $orderData
     * @return array<string, mixed>|null
     */
    public function normalize(array $orderData, Business $business, string $whatsappNumber): ?array
    {
        $baseName = trim((string) ($orderData['product_name'] ?? ''));
        if ($baseName === '') {
            return null;
        }

        $product = $business->products()->where('name', $baseName)->first();
        if (! $product) {
            $product = $business->products->first(fn ($p) => strcasecmp($p->name, $baseName) === 0);
        }

        $quantity = max(1, (int) ($orderData['quantity'] ?? 1));
        $customerPhone = trim((string) ($orderData['customer_phone'] ?? ''));

        if ($customerPhone === '') {
            return null;
        }

        $defaultPrice = $product ? (float) $product->price * $quantity : 0.0;
        $totalPrice = isset($orderData['total_price'])
            ? (float) $orderData['total_price']
            : $defaultPrice;

        $displayName = $this->formatProductNameWithVariants($baseName, $orderData);

        return [
            'product_name' => $displayName,
            'product_name_base' => $baseName,
            'quantity' => $quantity,
            'total_price' => $totalPrice,
            'customer_name' => trim((string) ($orderData['customer_name'] ?? '')) ?: 'N/A',
            'customer_address' => trim((string) ($orderData['customer_address'] ?? '')) ?: 'N/A',
            'customer_phone' => $customerPhone,
        ];
    }

    /**
     * @param  array<string, mixed>  $orderData
     */
    private function formatProductNameWithVariants(string $baseName, array $orderData): string
    {
        $parts = [];
        $labels = [
            'color' => 'Couleur',
            'size' => 'Taille',
            'gender' => 'Genre',
        ];

        foreach ($labels as $key => $label) {
            $value = trim((string) ($orderData[$key] ?? ''));
            if ($value !== '') {
                $parts[] = "{$label}: {$value}";
            }
        }

        if ($parts === []) {
            return $baseName;
        }

        return $baseName.' ('.implode(', ', $parts).')';
    }

    public function resolveStockProductName(array $normalizedOrder): string
    {
        return $normalizedOrder['product_name_base'] ?? $normalizedOrder['product_name'];
    }
}
