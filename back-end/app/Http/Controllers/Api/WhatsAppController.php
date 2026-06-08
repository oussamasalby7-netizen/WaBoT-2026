<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppController extends Controller
{
    private const ERR_UNREACHABLE = 'Service unreachable';

    public function status(Request $request, int $userId)
    {
        $this->authorizeUser($request, $userId);
        $this->startSessionIfNeeded($userId);

        $response = $this->callNode('get', "/sessions/{$userId}/status");

        return response()->json(
            $response ?? ['status' => 'success', 'data' => ['connected' => false, 'error' => self::ERR_UNREACHABLE]]
        );
    }

    public function qr(Request $request, int $userId)
    {
        $this->authorizeUser($request, $userId);
        $this->startSessionIfNeeded($userId);

        $response = $this->callNode('get', "/sessions/{$userId}/qr");

        if ($response === null) {
            return response()->json([
                'status' => 'error',
                'message' => 'WhatsApp service is not running. Run: npm start inside whatsapp-service/',
            ], 503);
        }

        return response()->json($response);
    }

    public function disconnect(Request $request, int $userId)
    {
        $this->authorizeUser($request, $userId);

        $response = $this->callNode('post', "/sessions/{$userId}/disconnect");

        return response()->json(
            $response ?? ['status' => 'error', 'message' => self::ERR_UNREACHABLE]
        );
    }

    public function start(Request $request, int $userId)
    {
        $this->authorizeUser($request, $userId);

        $response = $this->callNode('post', "/sessions/{$userId}/start");

        return response()->json(
            $response ?? ['status' => 'error', 'message' => self::ERR_UNREACHABLE]
        );
    }

    private function authorizeUser(Request $request, int $userId): void
    {
        $authUser = $request->user();

        if ($authUser->role !== 'admin' && $authUser->id !== $userId) {
            abort(403, 'You can only manage your own WhatsApp session.');
        }
    }

    private function startSessionIfNeeded(int $userId): void
    {
        $this->callNode('post', "/sessions/{$userId}/start");
    }

    private function callNode(string $method, string $path, array $body = []): ?array
    {
        $baseUrl = rtrim(config('services.baileys.url'), '/');
        $secret = config('services.baileys.secret');

        try {
            $client = Http::timeout(8)->withHeaders(['X-Service-Secret' => $secret]);

            $response = match ($method) {
                'post' => $client->post($baseUrl . $path, $body),
                default => $client->get($baseUrl . $path),
            };

            return $response->successful() ? $response->json() : null;
        } catch (\Throwable $e) {
            Log::warning("WhatsApp Node.js service unreachable [{$path}]: " . $e->getMessage());
            return null;
        }
    }
}

