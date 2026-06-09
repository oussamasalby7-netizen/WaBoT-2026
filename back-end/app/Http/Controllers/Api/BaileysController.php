<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageReceived;
use App\Events\OrderCreated;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\Message;
use App\Models\Order;
use App\Services\AIService;
use App\Services\OrderDataNormalizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BaileysController extends Controller
{
    public function incoming(Request $request, AIService $aiService)
    {
        $response = null;

        if ($request->header('X-Service-Secret') !== config('services.baileys.secret')) {
            Log::warning('Baileys incoming: invalid service secret', ['ip' => $request->ip()]);
            $response = response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
        }

        if (! $response) {
            $data = $request->validate([
                'from' => 'required|string',
                'body' => 'required|string|max:4096',
                'push_name' => 'nullable|string|max:255',
                'message_id' => 'nullable|string|max:255',
                'user_id' => 'required|integer|exists:users,id',
            ]);

            $fromNumber = $data['from'];
            $body = $data['body'];
            $messageId = $data['message_id'] ?? ('BAILEYS_' . uniqid());
            $userId = (int) $data['user_id'];

            $business = Business::where('user_id', $userId)->first();

            if (! $business) {
                Log::error("Baileys incoming: no business found for user_id {$userId}");
                $response = response()->json([
                    'status' => 'error',
                    'message' => 'No business configured for this user',
                ], 200);
            }
        }

        if (! $response) {
            if (Message::where('whatsapp_message_id', $messageId)->exists()) {
                Log::info("Baileys incoming duplicate skipped: {$messageId}");
                $response = response()->json(['status' => 'success', 'reply' => null]);
            }
        }

        if (! $response) {
            $customerMessage = Message::create([
                'business_id' => $business->id,
                'customer_number' => $fromNumber,
                'from_number' => $fromNumber,
                'body' => $body,
                'whatsapp_message_id' => $messageId,
            ]);

            event(new MessageReceived($business->id, $customerMessage->toArray()));

            try {
                $aiResponse = $aiService->generateReply($business, $body, $fromNumber);
                $aiReply = $aiResponse['reply'] ?? null;
                $orderData = $aiResponse['order'] ?? null;
            } catch (\Throwable $e) {
                Log::error("AIService exception for Baileys message from {$fromNumber}: " . $e->getMessage());
                $aiReply = "Merci pour votre message ! Un agent vous repondra tres bientot.";
                $orderData = null;
            }

            if ($aiReply) {
                $aiMessage = Message::create([
                    'business_id' => $business->id,
                    'customer_number' => $fromNumber,
                    'from_number' => 'AI_ASSISTANT',
                    'body' => $aiReply,
                    'whatsapp_message_id' => 'AI_' . uniqid(),
                ]);

                event(new MessageReceived($business->id, $aiMessage->toArray()));
            }

            if ($orderData) {
                $this->createOrderFromAI($business, $customerMessage, $fromNumber, $orderData);
            }

            $response = response()->json([
                'status' => 'success',
                'reply' => $aiReply,
                'order' => $orderData,
            ]);
        }

        return $response;
    }

    public function health()
    {
        return response()->json(['status' => 'ok', 'service' => 'laravel']);
    }

    private function createOrderFromAI(Business $business, Message $message, string $fromNumber, array $orderData): void
    {
        try {
            $alreadyExists = Order::where('message_id', $message->id)->exists();
            $recentDuplicate = Order::where('business_id', $business->id)
                ->where('customer_name', $orderData['customer_name'] ?? '')
                ->where('product_name', $orderData['product_name'] ?? '')
                ->where('quantity', $orderData['quantity'] ?? 0)
                ->where('created_at', '>=', now()->subMinutes(2))
                ->exists();

            if ($alreadyExists || $recentDuplicate) {
                Log::warning('Baileys AI order duplicate prevented', [
                    'message_id' => $message->id,
                    'recent' => $recentDuplicate,
                ]);
                return;
            }

            $order = $business->orders()->create([
                'product_name' => $orderData['product_name'] ?? 'Unknown Product',
                'quantity' => (int) ($orderData['quantity'] ?? 1),
                'total_price' => (float) ($orderData['total_price'] ?? 0),
                'customer_name' => $orderData['customer_name'] ?? 'N/A',
                'customer_address' => $orderData['customer_address'] ?? 'N/A',
                'customer_phone' => $orderData['customer_phone'] ?? $fromNumber,
                'message_id' => $message->id,
                'status' => 'pending',
            ]);

            try {
                $stockName = app(OrderDataNormalizer::class)->resolveStockProductName($orderData);
                $product = $business->products()->where('name', $stockName)->first();
                if ($product) {
                    $product->decrement('stock', $order->quantity);
                }
            } catch (\Throwable $stockError) {
                Log::error('Baileys stock decrement failed: ' . $stockError->getMessage());
            }

            event(new OrderCreated($business->id, $order));
        } catch (\Throwable $e) {
            Log::error('Baileys order creation failed: ' . $e->getMessage());
        }
    }
}

