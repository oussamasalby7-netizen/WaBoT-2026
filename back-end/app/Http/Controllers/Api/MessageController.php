<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageReceived;
use App\Http\Controllers\Controller;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class MessageController extends Controller
{
    public function index(Request $request)
    {
        $business = $request->user()->business;

        if (! $business) {
            return response()->json([
                'status' => 'error',
                'message' => 'Business not found',
            ], 404);
        }

        $messages = $business->messages()
            ->orderBy('created_at')
            ->get()
            ->groupBy(fn ($message) => $message->customer_number ?: $message->from_number);

        $conversations = $messages->map(function ($thread, $customerNumber) {
            $latest = $thread->last();
            $unreadCount = $thread->where('is_read', false)->where('from_number', '!=', 'AI_ASSISTANT')->count();

            return [
                'customer_number' => $customerNumber,
                'name' => 'Customer ' . substr($customerNumber, -4),
                'last_message' => $latest?->body,
                'last_message_at' => $latest?->created_at,
                'unread' => $unreadCount,
                'messages' => $thread->map(function ($message) {
                    return [
                        'id' => $message->id,
                        'customer_number' => $message->customer_number,
                        'from_number' => $message->from_number,
                        'body' => $message->body,
                        'sender' => $message->from_number === 'AI_ASSISTANT' ? 'ai' : 'customer',
                        'is_read' => $message->is_read,
                        'created_at' => $message->created_at,
                    ];
                })->values(),
            ];
        })->sortByDesc('last_message_at')->values();

        return response()->json([
            'status' => 'success',
            'data' => $conversations,
        ]);
    }

    public function markAsRead(Request $request, string $customerNumber)
    {
        $business = $request->user()->business;

        if (! $business) {
            return response()->json([
                'status' => 'error',
                'message' => 'Business not found',
            ], 404);
        }

        $business->messages()
            ->where('customer_number', $customerNumber)
            ->where('is_read', false)
            ->where('from_number', '!=', 'AI_ASSISTANT')
            ->update(['is_read' => true]);

        return response()->json([
            'status' => 'success',
            'message' => 'Messages marked as read',
        ]);
    }

    public function reply(Request $request, string $customerNumber)
    {
        $business = $request->user()->business;

        if (! $business) {
            return response()->json([
                'status' => 'error',
                'message' => 'Business not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'body' => 'required|string|max:4096',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $message = Message::create([
            'business_id' => $business->id,
            'customer_number' => $customerNumber,
            'from_number' => 'AI_ASSISTANT',
            'body' => $request->body,
            'whatsapp_message_id' => 'MANUAL_' . uniqid(),
        ]);

        event(new MessageReceived($business->id, $message->toArray()));

        $sendResult = $this->sendBaileysMessage(
            $request->user()->id,
            $customerNumber,
            $request->body
        );

        return response()->json([
            'status' => 'success',
            'message' => $sendResult['sent'] ? 'Message sent successfully' : 'Message saved, but WhatsApp send failed',
            'send_error' => $sendResult['error'],
            'data' => [
                'id' => $message->id,
                'customer_number' => $message->customer_number,
                'from_number' => $message->from_number,
                'body' => $message->body,
                'sender' => 'ai',
                'created_at' => $message->created_at,
            ],
        ], $sendResult['sent'] ? 201 : 202);
    }

    private function sendBaileysMessage(int $userId, string $to, string $message): array
    {
        $baseUrl = rtrim(config('services.baileys.url'), '/');
        $secret = config('services.baileys.secret');

        if (! $baseUrl || ! $secret) {
            return ['sent' => false, 'error' => 'Baileys service is not configured'];
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders(['X-Service-Secret' => $secret])
                ->post($baseUrl . '/send', [
                    'userId' => (string) $userId,
                    'to' => $to,
                    'message' => $message,
                ]);

            if ($response->successful()) {
                return ['sent' => true, 'error' => null];
            }

            Log::error('Baileys manual reply error: ' . $response->body());
            return ['sent' => false, 'error' => $response->json('message') ?? 'WhatsApp session is not connected'];
        } catch (\Throwable $e) {
            Log::error('Baileys manual reply exception: ' . $e->getMessage());
            return ['sent' => false, 'error' => 'Baileys service is unreachable'];
        }
    }
}