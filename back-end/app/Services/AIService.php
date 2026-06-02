<?php

namespace App\Services;

use App\Models\Business;
use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIService
{
    public function __construct(
        private readonly SalesAssistantPromptBuilder $promptBuilder,
        private readonly OrderDataNormalizer $orderNormalizer,
    ) {}

    /**
     * Generate a context-aware sales assistant reply via OpenAI.
     *
     * @return array{reply: string, order: array<string, mixed>|null}
     */
    public function generateReply(Business $business, string $customerMessage, ?string $fromNumber = null): array
    {
        $apiKey = config('services.openai.key');

        if (! $apiKey) {
            Log::error('OpenAI API Key is missing in configuration.');

            return [
                'reply' => 'Désolé, notre service est temporairement indisponible. Un agent humain vous répondra bientôt.',
                'order' => null,
            ];
        }

        $business->loadMissing('products');

        $history = $this->buildConversationHistory($business, $fromNumber, $customerMessage);
        $systemPrompt = $this->promptBuilder->buildSystemPrompt($business, $fromNumber);
        $tools = $this->promptBuilder->buildTools();

        try {
            $baseUrl = config('services.openai.base_url', 'https://api.openai.com/v1');

            $apiMessages = [['role' => 'system', 'content' => $systemPrompt]];
            foreach ($history as $entry) {
                $apiMessages[] = $entry;
            }
            $apiMessages[] = ['role' => 'user', 'content' => $customerMessage];

            $response = Http::withToken($apiKey)
                ->timeout(30)
                ->post($baseUrl.'/chat/completions', [
                    'model' => config('services.openai.model', 'gpt-4o-mini'),
                    'messages' => $apiMessages,
                    'tools' => $tools,
                    'tool_choice' => 'auto',
                    'temperature' => 0.4,
                ]);

            if (! $response->successful()) {
                Log::error('OpenAI API Error: '.$response->body());

                return [
                    'reply' => "Une erreur s'est produite lors de la génération de la réponse. Veuillez patienter.",
                    'order' => null,
                ];
            }

            $message = $response->json('choices.0.message');
            $reply = trim((string) ($message['content'] ?? ''));
            $orderData = null;

            if (isset($message['tool_calls'])) {
                foreach ($message['tool_calls'] as $toolCall) {
                    if (($toolCall['function']['name'] ?? '') !== 'create_order') {
                        continue;
                    }

                    $raw = json_decode($toolCall['function']['arguments'] ?? '{}', true);
                    if (! is_array($raw)) {
                        continue;
                    }

                    $normalized = $fromNumber
                        ? $this->orderNormalizer->normalize($raw, $business, $fromNumber)
                        : null;

                    if ($normalized) {
                        $orderData = $normalized;
                        if ($reply === '') {
                            $reply = $this->buildOrderConfirmationReply($normalized);
                        }
                    }
                }
            }

            if ($reply === '') {
                $reply = 'Merci pour votre message ! Comment puis-je vous aider ?';
            }

            Log::info('OpenAI reply generated successfully for Business ID: '.$business->id);

            return [
                'reply' => $reply,
                'order' => $orderData,
            ];
        } catch (\Exception $e) {
            Log::error('Exception in AIService: '.$e->getMessage());

            return [
                'reply' => 'Le service AI est injoignable. Merci de votre patience.',
                'order' => null,
            ];
        }
    }

    /**
     * @return array<int, array{role: string, content: string}>
     */
    private function buildConversationHistory(Business $business, ?string $fromNumber, string $customerMessage): array
    {
        if (! $fromNumber) {
            return [];
        }

        $history = [];
        $messages = Message::query()
            ->where('customer_number', $fromNumber)
            ->where('business_id', $business->id)
            ->latest()
            ->take(15)
            ->get()
            ->reverse();

        foreach ($messages as $msg) {
            $role = $msg->from_number === 'AI_ASSISTANT' ? 'assistant' : 'user';
            if ($msg->body === $customerMessage && $role === 'user') {
                continue;
            }
            $history[] = ['role' => $role, 'content' => $msg->body];
        }

        return $history;
    }

    /**
     * @param  array<string, mixed>  $order
     */
    private function buildOrderConfirmationReply(array $order): string
    {
        $product = $order['product_name'] ?? 'votre commande';
        $qty = $order['quantity'] ?? 1;
        $total = $order['total_price'] ?? 0;

        return "✅ Commande bien reçue !\n"
            ."{$qty}× {$product} — {$total} DH\n"
            ."Nous préparons votre commande. Merci pour votre confiance ! 🙏";
    }
}
