<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportMessage;
use Illuminate\Http\Request;

class SupportMessageController extends Controller
{
    /**
     * Authenticated user submits a support request.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'email' => 'required|email',
            'phone' => 'nullable|string|max:32',
            'message' => 'required|string|min:5|max:5000',
        ]);

        $msg = SupportMessage::query()->create([
            'user_id' => $user?->id,
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'message' => $validated['message'],
            'is_read' => false,
            'is_replied' => false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'We received your message. We will respond as soon as possible.',
            'data' => $msg,
        ]);
    }

    /**
     * Admin inbox list.
     */
    public function index()
    {
        $messages = SupportMessage::query()
            ->orderBy('is_read')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $messages,
        ]);
    }

    /**
     * Admin updates message status (read/unread, replied/unreplied).
     */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'is_read' => 'nullable|boolean',
            'is_replied' => 'nullable|boolean',
        ]);

        $msg = SupportMessage::findOrFail($id);

        if (array_key_exists('is_read', $validated)) {
            $msg->is_read = (bool) $validated['is_read'];
            $msg->read_at = $msg->is_read ? now() : null;
        }

        if (array_key_exists('is_replied', $validated)) {
            $msg->is_replied = (bool) $validated['is_replied'];
            $msg->replied_at = $msg->is_replied ? now() : null;
        }

        $msg->save();

        return response()->json([
            'status' => 'success',
            'data' => $msg->fresh(),
        ]);
    }
}

