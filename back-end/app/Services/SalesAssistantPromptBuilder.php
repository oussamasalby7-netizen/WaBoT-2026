<?php

namespace App\Services;

use App\Models\Business;
use App\Models\Order;
use App\Models\Product;

class SalesAssistantPromptBuilder
{
    private const CLOTHING_KEYWORDS = [
        'shirt', 't-shirt', 'tshirt', 'tee', 'pant', 'pants', 'jean', 'jeans',
        'robe', 'dress', 'chaussure', 'shoe', 'shoes', 'sneaker', 'vetement',
        'vêtement', 'clothing', 'hoodie', 'sweat', 'jacket', 'veste', 'coat',
        'pull', 'jupe', 'skirt', 'chemise', 'blouse', 'djellaba', 'jellaba',
        'kaftan', 'caftan', 'short', 'bermuda', 'legging', 'suit', 'costume',
        'abaya', 'hijab', 'foulard', 'scarf', 'sac', 'bag', 'basket',
        'maillot', 'swimwear', 'lingerie', 'sous-vetement', 'underwear',
        'polo', 'cardigan', 'gilet', 'manteau', 'boot', 'basket',
    ];

    public function buildSystemPrompt(Business $business, ?string $customerPhone): string
    {
        $businessName = $business->name;
        $businessDesc = $business->description ?: 'No additional description.';
        $catalog = $this->buildProductCatalog($business);
        $knownCustomer = $this->buildKnownCustomerBlock($business, $customerPhone);
        $phoneLine = 'Delivery phone is not auto-filled. Ask the customer to type the delivery phone number during checkout.';

        return <<<PROMPT
You are the professional WhatsApp sales assistant for "{$businessName}".

BUSINESS
{$businessDesc}

PRODUCT CATALOG (only sell these; never invent items or prices)
{$catalog}

{$knownCustomer}

{$phoneLine}

ROLE
Act as a calm, helpful sales agent: guide purchases, answer product questions, and complete orders without sounding robotic.

LANGUAGE
Match the customer's language (Darija, French, Arabic, or English). Keep messages natural for WhatsApp.

COLLECTION FLOW (strict order)
1) Product — confirm which catalog item they want.
2) Product-specific details — read that product's "QUESTIONS TO ASK" line in the catalog:
   - If custom questions are defined, ask ONLY those (never invent extra product questions).
   - If [clothing] with no custom questions: color, size, quantity; gender only if unclear.
   - If [general] with no custom questions: quantity only.
   - Ask max 2–3 of the still-missing questions per message.
3) Delivery identity — ask ONLY fields missing from KNOWN CUSTOMER PROFILE:
   - Full name
   - Full delivery address
   - Phone (always ask the customer to type the delivery phone; never use the WhatsApp sender number automatically)
4) Summary — one short recap (product, options, qty, price estimate, name, address, phone).
5) Confirmation — ask for explicit OK (OK / oui / نعم / واخا / yes). Call create_order ONLY after clear confirmation.

MESSAGE RULES (critical)
- Ask at most 2–3 questions per message — never dump a full form.
- Keep replies short: 1–3 lines, WhatsApp-friendly.
- Do NOT repeat questions already answered in the chat history or KNOWN CUSTOMER PROFILE.
- If the customer gives several answers at once, acknowledge them and only ask what is still missing.
- Never invent, infer, reuse, or auto-fill the delivery phone from the WhatsApp sender/contact number or stored profile. If the phone is missing, ask for it and wait.
- If stock is 0, say so and suggest another catalog item — do not sell out-of-stock products.
- If unsure or the request is outside the catalog, say you will connect them to a human agent.

ORDER COMPLETION
- Call create_order only after the customer typed the delivery phone in the conversation and explicitly confirmed the recap.
- After create_order succeeds, send a warm confirmation that the order is received and being prepared.
- Do not call create_order twice for the same purchase; for a new product, start a new flow.
- Calculate total_price = unit price × quantity using catalog prices only.

PRICING
Use only prices from the catalog. If quantity or options change, recalculate before confirming.
PROMPT;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function buildTools(): array
    {
        return [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'create_order',
                    'description' => 'Create the order after ALL required details are collected, including a delivery phone typed by the customer, and the customer explicitly confirmed (OK/yes/oui/نعم/واخا). Do not call early.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'product_name' => [
                                'type' => 'string',
                                'description' => 'Exact product name from the catalog (base name, without variants).',
                            ],
                            'quantity' => [
                                'type' => 'integer',
                                'description' => 'Number of units.',
                            ],
                            'total_price' => [
                                'type' => 'number',
                                'description' => 'Total in DH (unit price × quantity).',
                            ],
                            'customer_name' => [
                                'type' => 'string',
                                'description' => 'Customer full name for delivery.',
                            ],
                            'customer_address' => [
                                'type' => 'string',
                                'description' => 'Full delivery address.',
                            ],
                            'customer_phone' => [
                                'type' => 'string',
                                'description' => 'Delivery phone typed by the customer during this chat. Never use the WhatsApp sender number or a guessed number.',
                            ],
                            'color' => [
                                'type' => 'string',
                                'description' => 'Clothing only: color chosen.',
                            ],
                            'size' => [
                                'type' => 'string',
                                'description' => 'Clothing only: size (S/M/L/XL/36/etc.).',
                            ],
                            'gender' => [
                                'type' => 'string',
                                'description' => 'Clothing only when relevant: homme/femme/enfant/unisex.',
                            ],
                        ],
                        'required' => [
                            'product_name',
                            'quantity',
                            'total_price',
                            'customer_name',
                            'customer_address',
                            'customer_phone',
                        ],
                    ],
                ],
            ],
        ];
    }

    public function isClothingProduct(Product $product): bool
    {
        if (trim((string) ($product->ai_questions ?? '')) !== '') {
            return false;
        }

        $text = strtolower($product->name);

        foreach (self::CLOTHING_KEYWORDS as $keyword) {
            if (str_contains($text, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function buildProductCatalog(Business $business): string
    {
        if ($business->products->isEmpty()) {
            return '(No products listed — tell the customer to check back later.)';
        }

        $lines = [];
        foreach ($business->products as $product) {
            $type = $this->isClothingProduct($product) ? 'clothing' : 'general';
            $stockNote = $product->stock > 0 ? "Stock: {$product->stock}" : 'OUT OF STOCK';
            $ask = $this->resolveQuestionsForProduct($product, $type);

            $lines[] = sprintf(
                '- [%s] %s: %s DH | %s | QUESTIONS TO ASK: %s',
                $type,
                $product->name,
                $product->price,
                $stockNote,
                $ask
            );
        }

        return implode("\n", $lines);
    }

    private function resolveQuestionsForProduct(Product $product, string $type): string
    {
        $custom = trim((string) ($product->ai_questions ?? ''));
        if ($custom !== '') {
            return $custom.' (merchant-defined — follow exactly; 2–3 per message)';
        }

        if ($type === 'clothing') {
            return 'color, size, quantity; gender only if unclear';
        }

        return 'quantity';
    }

    private function buildKnownCustomerBlock(Business $business, ?string $customerPhone): string
    {
        if (! $customerPhone) {
            return "KNOWN CUSTOMER PROFILE\n(none yet - collect name, address, and a typed delivery phone during checkout)";
        }

        $order = Order::query()
            ->where('business_id', $business->id)
            ->where(function ($q) use ($customerPhone) {
                $normalized = $this->normalizePhone($customerPhone);
                $q->where('customer_phone', $customerPhone)
                    ->orWhere('customer_phone', $normalized)
                    ->orWhere('customer_phone', 'like', '%'.substr($normalized, -9));
            })
            ->whereNotNull('customer_name')
            ->where('customer_name', '!=', 'N/A')
            ->latest()
            ->first();

        if (! $order) {
            return "KNOWN CUSTOMER PROFILE\n- Name: unknown - ask once\n- Address: unknown - ask once\n- Phone: unknown - ask the customer to type the delivery phone";
        }

        $name = $order->customer_name;
        $address = ($order->customer_address && $order->customer_address !== 'N/A')
            ? $order->customer_address
            : 'unknown — ask once';
        return <<<BLOCK
KNOWN CUSTOMER PROFILE (name/address may be on file - do NOT ask again unless the customer wants to change them)
- Full name: {$name}
- Address: {$address}
- Phone: unknown for this checkout - ask the customer to type the delivery phone
BLOCK;
    }

    private function normalizePhone(string $phone): string
    {
        return preg_replace('/\D+/', '', $phone) ?: $phone;
    }
}
