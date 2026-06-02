<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\Message;
use App\Services\AIService;
use App\Services\OrderDataNormalizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    /**
     * GET /webhook — Meta webhook verification handshake.
     */
    public function verify(Request $request)
    {
        // Parse raw query string to keep hub.* keys with dots intact
        $params = [];
        $rawQuery = $request->server('QUERY_STRING', '');
        if ($rawQuery !== '') {
            foreach (explode('&', $rawQuery) as $pair) {
                if (str_contains($pair, '=')) {
                    [$k, $v] = explode('=', $pair, 2);
                    $params[urldecode($k)] = urldecode($v);
                }
            }
        }

        $mode      = $params['hub.mode']           ?? null;
        $token     = $params['hub.verify_token']   ?? null;
        $challenge = $params['hub.challenge']      ?? null;

        if (
            $mode === 'subscribe'
            && $token !== null
            && $token === config('services.whatsapp.verify_token')
            && $challenge !== null
        ) {
            Log::info('WhatsApp Webhook successfully verified.');
            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }

        Log::warning('WhatsApp webhook verification failed.', [
            'mode' => $mode,
            'token_provided' => $token !== null,
        ]);

        return response('Forbidden', 403);
    }

    /**
     * POST /webhook — Handle incoming WhatsApp messages and statuses.
     */
    public function handleWebhook(Request $request, AIService $aiService, $phone_number_id = null)
    {
        // Handle GET verification on the /api/webhook path (legacy / API prefix)
        if ($request->isMethod('get')) {
            return $this->verify($request);
        }

        $payload = $request->all();
        Log::info('WhatsApp Webhook POST received', [
            'object' => $payload['object'] ?? null,
            'entry_count' => isset($payload['entry']) ? count($payload['entry']) : 0,
        ]);

        // Validate payload structure
        if (!isset($payload['object']) || $payload['object'] !== 'whatsapp_business_account') {
            Log::warning('Webhook ignored: Invalid object type', ['object' => $payload['object'] ?? null]);
            return response()->json(['status' => 'ignored'], 200);
        }

        foreach ($payload['entry'] as $entry) {
            foreach ($entry['changes'] as $change) {
                if ($change['field'] !== 'messages') {
                    continue; // Skip non-message events
                }

                $value = $change['value'];
                $metaPhoneNumberId = $value['metadata']['phone_number_id'] ?? null;

                // Handle message statuses (sent, delivered, read)
                if (isset($value['statuses'])) {
                    Log::info('Received WhatsApp message status update', ['statuses' => $value['statuses']]);
                    continue; // We can ignore statuses for now
                }

                // Handle incoming messages
                if (isset($value['messages'])) {
                    $messageData = $value['messages'][0];
                    $fromNumber = $messageData['from'];
                    $whatsappMessageId = $messageData['id'];
                    $messageType = $messageData['type'];
                    
                    // We only handle text messages in this basic implementation
                    if ($messageType !== 'text') {
                        Log::info("Ignored non-text message type: {$messageType}");
                        continue;
                    }

                    $body = $messageData['text']['body'];
                    $customerName = $value['contacts'][0]['profile']['name'] ?? 'Unknown';

                    Log::info('Incoming WhatsApp Message', [
                        'from' => $fromNumber,
                        'phone_number_id' => $metaPhoneNumberId,
                        'message_type' => $messageType,
                    ]);

                    // Resolve Business by Phone Number ID
                    $business = Business::where('whatsapp_phone_number_id', $metaPhoneNumberId)->first();

                    if (!$business) {
                        Log::error("Webhook error: Business not found for phone_number_id: {$metaPhoneNumberId}");
                        // Still return 200 so Meta doesn't retry endlessly
                        return response()->json(['status' => 'error', 'message' => 'Unknown business'], 200);
                    }

                    // Save incoming message to DB
                    $customerMessage = Message::create([
                        'business_id' => $business->id,
                        'customer_number' => $fromNumber,
                        'from_number' => $fromNumber,
                        'body' => $body,
                        'whatsapp_message_id' => $whatsappMessageId,
                    ]);

                    event(new \App\Events\MessageReceived($business->id, $customerMessage->toArray()));

                    $aiReply = "WaBOT AI received your message successfully 🚀\n\nYou said: \"{$body}\"";
                    $orderData = null;

                    // Call the real AI service
                    try {
                        if ($aiService) {
                            $aiResponse = $aiService->generateReply($business, $body, $fromNumber);
                            $aiReply = $aiResponse['reply'] ?? $aiReply;
                            $orderData = $aiResponse['order'] ?? null;
                        }
                    } catch (\Exception $e) {
                        Log::error("AI Service failed: " . $e->getMessage());
                        $aiReply = "Sorry, my AI brain is currently offline. 🤖\n\n(Error: " . $e->getMessage() . ")";
                    }

                    // Store AI Reply in DB
                    $aiMessage = Message::create([
                        'business_id' => $business->id,
                        'customer_number' => $fromNumber,
                        'from_number' => 'AI_ASSISTANT',
                        'body' => $aiReply,
                        'whatsapp_message_id' => 'AI_' . uniqid(),
                    ]);

                    event(new \App\Events\MessageReceived($business->id, $aiMessage->toArray()));

                    // If AI generated an order, create it and broadcast it
                    if ($orderData) {
                        try {
                            // 1. Strict Duplicate Check: Same message_id
                            $alreadyExists = \App\Models\Order::where('message_id', $customerMessage->id)->exists();
                            
                            // 2. Intent Duplicate Check: Same customer, same product, same quantity in the last 2 minutes
                            $recentDuplicate = \App\Models\Order::where('business_id', $business->id)
                                ->where('customer_name', $orderData['customer_name'] ?? '')
                                ->where('product_name', $orderData['product_name'] ?? '')
                                ->where('quantity', $orderData['quantity'] ?? 0)
                                ->where('created_at', '>=', now()->subMinutes(2))
                                ->exists();

                            if (!$alreadyExists && !$recentDuplicate) {
                                $order = $business->orders()->create([
                                    'product_name'     => $orderData['product_name'] ?? 'Unknown Product',
                                    'quantity'         => $orderData['quantity'] ?? 1,
                                    'total_price'      => $orderData['total_price'] ?? 0,
                                    'customer_name'    => $orderData['customer_name'] ?? 'N/A',
                                    'customer_address' => $orderData['customer_address'] ?? 'N/A',
                                    'customer_phone'   => $orderData['customer_phone'] ?? $fromNumber,
                                    'message_id'       => $customerMessage->id,
                                    'status'           => 'pending',
                                ]);
                                // Decrement Product Stock
                                try {
                                    $stockName = app(OrderDataNormalizer::class)->resolveStockProductName($orderData);
                                    $product = $business->products()->where('name', $stockName)->first();
                                    if ($product) {
                                        $product->decrement('stock', $order->quantity);
                                        Log::info("Stock decremented for product: {$product->name}", [
                                            'new_stock' => $product->stock,
                                            'decremented_by' => $order->quantity
                                        ]);
                                    } else {
                                        Log::warning("Stock decrement failed: Product '{$order->product_name}' not found for Business ID: {$business->id}");
                                    }
                                } catch (\Exception $stockEx) {
                                    Log::error("Error decrementing stock: " . $stockEx->getMessage());
                                }

                                event(new \App\Events\OrderCreated($business->id, $order));
                                Log::info("Order successfully created via AI", ['order_id' => $order->id]);
                            } else {
                                Log::warning("Duplicate order prevented", [
                                    'message_id' => $customerMessage->id,
                                    'recent' => $recentDuplicate
                                ]);
                            }
                        } catch (\Exception $e) {
                            Log::error("Failed to create AI order: " . $e->getMessage());
                        }
                    }

                    // Send the real message back via WhatsApp Cloud API
                    $this->sendWhatsAppMessage($fromNumber, $aiReply, $metaPhoneNumberId);

                    return response()->json([
                        'status' => 'success',
                        'message' => 'Processed and Sent',
                        'ai_reply' => $aiReply,
                    ], 200);
                }
            }
        }

        return response()->json(['status' => 'success'], 200);
    }

    /**
     * Send real message via WhatsApp Cloud API.
     */
    private function sendWhatsAppMessage($to, $messageText, $phone_number_id)
    {
        $accessToken = config('services.whatsapp.token');
        
        if (!$accessToken) {
            Log::error("WhatsApp API Error: WHATSAPP_ACCESS_TOKEN is missing or empty.");
            return;
        }

        $url = "https://graph.facebook.com/v18.0/{$phone_number_id}/messages";
        
        Log::info("Sending WhatsApp reply to {$to}", ['url' => $url]);

        try {
            $response = Http::withToken($accessToken)->post($url, [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $to,
                'type' => 'text',
                'text' => ['preview_url' => false, 'body' => $messageText]
            ]);

            if ($response->successful()) {
                Log::info("WhatsApp message sent successfully!", [
                    'to' => $to,
                    'meta_message_id' => $response->json('messages.0.id') ?? 'unknown'
                ]);
            } else {
                Log::error("WhatsApp API Error Response", [
                    'status' => $response->status(),
                    'body' => $response->json()
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Exception sending WhatsApp: " . $e->getMessage());
        }
    }
}
