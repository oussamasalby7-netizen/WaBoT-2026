<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\WebhookController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

// ── WhatsApp Cloud API Webhook ─────────────────────────────────────────────
// These MUST be web routes (not api/) so the URL is /webhook, not /api/webhook.
// CSRF is excluded for this path in VerifyCsrfToken.php.
Route::get('/webhook',  [WebhookController::class, 'verify']);
Route::post('/webhook', [WebhookController::class, 'handleWebhook']);
