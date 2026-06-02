<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BusinessController extends Controller
{
    /**
     * Get the authenticated user's business.
     */
    public function show(Request $request)
    {
        $business = $request->user()->business;

        if (!$business) {
            return response()->json([
                'status' => 'error',
                'message' => 'No business found for this user'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $business
        ]);
    }

    /**
     * Create or update the user's business.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'phone' => 'required|string|max:20',
            'whatsapp_phone_number_id' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Each user has only ONE business
        $business = Business::updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'name' => $request->name,
                'description' => $request->description,
                'phone' => $request->phone,
                'whatsapp_phone_number_id' => $request->whatsapp_phone_number_id,
            ]
        );

        $status = $business->wasRecentlyCreated ? 201 : 200;
        $message = $business->wasRecentlyCreated ? 'Business created successfully' : 'Business updated successfully';

        return response()->json([
            'status' => 'success',
            'message' => $message,
            'data' => $business
        ], $status);
    }

    /**
     * Update the business (Alternative to store if you want specific update endpoint).
     */
    public function update(Request $request)
    {
        return $this->store($request);
    }

    /**
     * Delete the user's business.
     */
    public function destroy(Request $request)
    {
        $business = $request->user()->business;

        if (!$business) {
            return response()->json([
                'status' => 'error',
                'message' => 'No business found to delete'
            ], 404);
        }

        $business->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Business deleted successfully'
        ]);
    }
}
