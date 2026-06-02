<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    /**
     * Display a listing of the user's products.
     */
    public function index(Request $request)
    {
        $business = $request->user()->business;

        if (!$business) {
            return response()->json([
                'status' => 'error',
                'message' => 'Business not found. Please create a business first.'
            ], 404);
        }

        $products = $business->products;

        return response()->json([
            'status' => 'success',
            'data' => $products
        ]);
    }

    /**
     * Store a newly created product.
     */
    public function store(Request $request)
    {
        $business = $request->user()->business;

        if (!$business) {
            return response()->json([
                'status' => 'error',
                'message' => 'Business not found. Please create a business first.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'stock' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $product = $business->products()->create([
            'name' => $request->name,
            'price' => $request->price,
            'description' => $request->description,
            'stock' => $request->stock,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Product created successfully',
            'data' => $product
        ], 201);
    }

    /**
     * Display the specified product.
     */
    public function show(Request $request, $id)
    {
        $business = $request->user()->business;
        $product = $business?->products()->find($id);

        if (!$product) {
            return response()->json([
                'status' => 'error',
                'message' => 'Product not found or access denied'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $product
        ]);
    }

    /**
     * Update the specified product.
     */
    public function update(Request $request, $id)
    {
        $business = $request->user()->business;
        $product = $business?->products()->find($id);

        if (!$product) {
            return response()->json([
                'status' => 'error',
                'message' => 'Product not found or access denied'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|numeric|min:0',
            'description' => 'nullable|string',
            'stock' => 'sometimes|required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $product->update($request->only(['name', 'price', 'description', 'stock']));

        return response()->json([
            'status' => 'success',
            'message' => 'Product updated successfully',
            'data' => $product
        ]);
    }

    /**
     * Remove the specified product.
     */
    public function destroy(Request $request, $id)
    {
        $business = $request->user()->business;
        $product = $business?->products()->find($id);

        if (!$product) {
            return response()->json([
                'status' => 'error',
                'message' => 'Product not found or access denied'
            ], 404);
        }

        $product->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Product deleted successfully'
        ]);
    }
}
