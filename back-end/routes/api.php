<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:10,1');

// â”€â”€ Feature: Forgot / Reset Password 
Route::post('/forgot-password', [App\Http\Controllers\Api\ForgotPasswordController::class, 'sendLink'])
    ->middleware('throttle:5,1')
    ->name('password.email');

Route::post('/reset-password', [App\Http\Controllers\Api\ResetPasswordController::class, 'reset'])
    ->middleware('throttle:5,1')
    ->name('password.update');

// â”€â”€ Feature: OTP Email Verification during Registration 
Route::post('/register/initiate', [App\Http\Controllers\Api\OtpRegistrationController::class, 'initiate'])
    ->middleware('throttle:10,1');

Route::post('/register/verify', [App\Http\Controllers\Api\OtpRegistrationController::class, 'verify'])
    ->middleware('throttle:20,1');

Route::post('/register/resend', [App\Http\Controllers\Api\OtpRegistrationController::class, 'resend'])
    ->middleware('throttle:5,1');

// WhatsApp Webhook routes
Route::match(['get', 'post'], '/webhook/{phone_number_id?}', [App\Http\Controllers\Api\WebhookController::class, 'handleWebhook']);

// Baileys WhatsApp Microservice routes
Route::post('/baileys/incoming', [App\Http\Controllers\Api\BaileysController::class, 'incoming']);
Route::get('/baileys/health', [App\Http\Controllers\Api\BaileysController::class, 'health']);
// Stripe (no Sanctum; verified via signing secret)
Route::post('/stripe/webhook', [App\Http\Controllers\Api\StripeWebhookController::class, 'handle']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'profile']);
    Route::patch('/user/preferences', [AuthController::class, 'updatePreferences']);
    Route::patch('/user/email', [AuthController::class, 'updateEmail']);
    Route::patch('/user/password', [AuthController::class, 'updatePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Support: allow any authenticated user to contact support (even if subscription is expired).
    Route::post('/support/messages', [App\Http\Controllers\Api\SupportMessageController::class, 'store']);


    // Per-user WhatsApp session endpoints (Baileys)
    Route::prefix('whatsapp/{userId}')->group(function () {
        Route::get('/status', [App\Http\Controllers\Api\WhatsAppController::class, 'status']);
        Route::get('/qr', [App\Http\Controllers\Api\WhatsAppController::class, 'qr']);
        Route::post('/start', [App\Http\Controllers\Api\WhatsAppController::class, 'start']);
        Route::post('/disconnect', [App\Http\Controllers\Api\WhatsAppController::class, 'disconnect']);
    });
    // TEST MODE (isolated): enabled only when TEST_MODE=true in environment.
    if (config('app.test_mode') === true) {
        Route::post('/test/ai', [App\Http\Controllers\Api\TestModeController::class, 'ai']);
        Route::post('/test/whatsapp-sandbox', [App\Http\Controllers\Api\TestModeController::class, 'whatsappSandbox']);
    }
});

// SaaS features: active paid PRO subscription required (admins exempt inside middleware)
Route::middleware(['auth:sanctum', 'subscribed'])->group(function () {
    Route::get('/business', [App\Http\Controllers\Api\BusinessController::class, 'show']); // NOSONAR
    Route::post('/business', [App\Http\Controllers\Api\BusinessController::class, 'store']); // NOSONAR
    Route::delete('/business', [App\Http\Controllers\Api\BusinessController::class, 'destroy']); // NOSONAR

    Route::get('/products', [App\Http\Controllers\Api\ProductController::class, 'index']);
    Route::post('/products', [App\Http\Controllers\Api\ProductController::class, 'store']);
    Route::get('/products/{id}', [App\Http\Controllers\Api\ProductController::class, 'show']); // NOSONAR
    Route::put('/products/{id}', [App\Http\Controllers\Api\ProductController::class, 'update']); // NOSONAR
    Route::delete('/products/{id}', [App\Http\Controllers\Api\ProductController::class, 'destroy']); // NOSONAR

    Route::get('/orders', [App\Http\Controllers\Api\OrderController::class, 'index']);
    Route::post('/orders', [App\Http\Controllers\Api\OrderController::class, 'store']);
    Route::get('/orders/{id}', [App\Http\Controllers\Api\OrderController::class, 'show']); // NOSONAR
    Route::put('/orders/{id}', [App\Http\Controllers\Api\OrderController::class, 'update']); // NOSONAR
    Route::delete('/orders/{id}', [App\Http\Controllers\Api\OrderController::class, 'destroy']); // NOSONAR

    Route::get('/messages', [App\Http\Controllers\Api\MessageController::class, 'index']);
    Route::post('/messages/{customerNumber}/reply', [App\Http\Controllers\Api\MessageController::class, 'reply']);
    Route::post('/messages/{customerNumber}/read', [App\Http\Controllers\Api\MessageController::class, 'markAsRead']);
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/saas-stats', [App\Http\Controllers\Api\AdminController::class, 'getSaaSStats']);
    Route::get('/users', [App\Http\Controllers\Api\AdminController::class, 'index']);
    Route::put('/users/{id}/subscription', [App\Http\Controllers\Api\AdminController::class, 'updateSubscription']);
    Route::post('/users/{id}/toggle-block', [App\Http\Controllers\Api\AdminController::class, 'toggleBlock']);
    Route::delete('/users/{id}', [App\Http\Controllers\Api\AdminController::class, 'deleteUser']);

    // Support inbox
    Route::get('/support-messages', [App\Http\Controllers\Api\SupportMessageController::class, 'index']);
    Route::patch('/support-messages/{id}', [App\Http\Controllers\Api\SupportMessageController::class, 'update']);
});
