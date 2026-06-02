<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\Message;
use App\Services\AIService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TestModeController extends Controller
{
    /**
     * Test-only AI prompt endpoint (no WhatsApp send).
     */
    public function ai(Request $request, AIService $aiService)
    {
        $validated = $request->validate([
            'prompt' => 'required|string|min:1|max:8000',
            'business_id' => 'nullable|integer',
        ]);

        $user = $request->user();
        $business = null;

        if (! empty($validated['business_id'])) {
            $business = Business::query()
                ->whereKey((int) $validated['business_id'])
                ->where('user_id', $user->id)
                ->first();
        } else {
            $business = $user->business;
        }

        if (! $business) {
            return response()->json(['status' => 'error', 'message' => 'Business not found'], 404);
        }

        $ai = $aiService->generateReply($business, $validated['prompt'], 'TEST_LAB');

        return response()->json([
            'status' => 'success',
            'data' => [
                'reply' => $ai['reply'] ?? '',
                'order' => $ai['order'] ?? null,
            ],
        ]);
    }

    /**
     * Test-only WhatsApp sandbox webhook: stores messages and generates AI reply, but DOES NOT send to Meta API.
     */
    public function whatsappSandbox(Request $request, AIService $aiService)
    {
        $validated = $request->validate([
            'business_id' => 'nullable|integer',
            'from' => 'required|string|max:32',
            'body' => 'required|string|max:4096',
        ]);

        $user = $request->user();
        $business = null;

        if (! empty($validated['business_id'])) {
            $business = Business::query()
                ->whereKey((int) $validated['business_id'])
                ->where('user_id', $user->id)
                ->first();
        } else {
            $business = $user->business;
        }

        if (! $business) {
            return response()->json(['status' => 'error', 'message' => 'Business not found'], 404);
        }

        $fromNumber = $validated['from'];
        $body = $validated['body'];
        $whatsappMessageId = 'SANDBOX_' . Str::random(12);

        Message::create([
            'business_id' => $business->id,
            'customer_number' => $fromNumber,
            'from_number' => $fromNumber,
            'body' => $body,
            'whatsapp_message_id' => $whatsappMessageId,
        ]);

        $aiResponse = $aiService->generateReply($business, $body, $fromNumber);
        $aiReply = $aiResponse['reply'] ?? '';

        Message::create([
            'business_id' => $business->id,
            'customer_number' => $fromNumber,
            'from_number' => 'AI_ASSISTANT',
            'body' => $aiReply,
            'whatsapp_message_id' => 'AI_' . $whatsappMessageId,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => [
                'ai_reply' => $aiReply,
                'order' => $aiResponse['order'] ?? null,
            ],
        ]);
    }
}

