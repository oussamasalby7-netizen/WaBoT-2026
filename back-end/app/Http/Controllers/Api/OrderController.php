<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    private const ERR_NOT_FOUND = 'Order not found or access denied';

    /**
     * Display a listing of the user's business orders.
     */
    public function index(Request $request)
    {
        $business = $request->user()->business;

        if (!$business) {
            return response()->json([
                'status' => 'error',
                'message' => 'Business not found'
            ], 404);
        }

        // List orders with related message for better context
        $orders = $business->orders()->with('message')->latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $orders
        ]);
    }

    /**
     * Store a newly created order.
     */
    public function store(Request $request)
    {
        $business = $request->user()->business;

        if (!$business) {
            return response()->json([
                'status' => 'error',
                'message' => 'Business not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'product_name'     => 'required|string|max:255',
            'quantity'         => 'required|integer|min:1',
            'total_price'      => 'required|numeric|min:0',
            'customer_name'    => 'nullable|string|max:255',
            'customer_address' => 'nullable|string',
            'customer_phone'   => 'nullable|string|max:20',
            'message_id'       => 'nullable|exists:messages,id',
            'status'           => 'nullable|string|in:pending,completed,cancelled'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $order = $business->orders()->create([
            'product_name'     => $request->product_name,
            'quantity'         => $request->quantity,
            'total_price'      => $request->total_price,
            'customer_name'    => $request->customer_name,
            'customer_address' => $request->customer_address,
            'customer_phone'   => $request->customer_phone,
            'message_id'       => $request->message_id,
            'status'           => $request->status ?? 'pending',
        ]);

        event(new \App\Events\OrderCreated($business->id, $order));

        return response()->json([
            'status' => 'success',
            'message' => 'Order created successfully',
            'data' => $order
        ], 201);
    }

    /**
     * Display the specified order.
     */
    public function show(Request $request, $id)
    {
        $business = $request->user()->business;
        $order = $business?->orders()->with('message')->find($id);

        if (!$order) {
            return response()->json([
                'status' => 'error',
                'message' => self::ERR_NOT_FOUND
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $order
        ]);
    }

    /**
     * Update the order (e.g., status).
     */
    public function update(Request $request, $id)
    {
        $business = $request->user()->business;
        $order = $business?->orders()->find($id);

        if (!$order) {
            return response()->json([
                'status' => 'error',
                'message' => self::ERR_NOT_FOUND
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status'           => 'required|string|in:pending,completed,cancelled',
            'product_name'     => 'sometimes|string|max:255',
            'quantity'         => 'sometimes|integer|min:1',
            'total_price'      => 'sometimes|numeric|min:0',
            'customer_name'    => 'sometimes|string|max:255',
            'customer_address' => 'sometimes|string',
            'customer_phone'   => 'sometimes|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $order->update($request->all());

        event(new \App\Events\OrderUpdated($business->id, $order->id, $order->status));

        return response()->json([
            'status' => 'success',
            'message' => 'Order updated successfully',
            'data' => $order
        ]);
    }

    /**
     * Remove the specified order.
     */
    public function destroy(Request $request, $id)
    {
        $business = $request->user()->business;
        $order = $business?->orders()->find($id);

        if (!$order) {
            return response()->json([
                'status' => 'error',
                'message' => self::ERR_NOT_FOUND
            ], 404);
        }

        $order->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Order deleted successfully'
        ]);
    }
}
