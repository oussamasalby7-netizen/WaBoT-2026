<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'broadcasting/auth'],

    'allowed_methods' => ['*'],

    'allowed_origins' => (function () {
        $origins = [];

        foreach (explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')) as $origin) {
            $origin = trim($origin);
            if ($origin !== '') {
                $origins[] = $origin;
            }
        }

        $frontendUrl = trim((string) env('FRONTEND_URL', ''));
        if ($frontendUrl !== '') {
            $origins[] = $frontendUrl;
        }

        // Production Vercel deployment
        $origins[] = 'https://wa-bo-t-2026.vercel.app';

        if (empty($origins)) {
            $origins[] = 'http://localhost:5173';
        }

        return array_values(array_unique($origins));
    })(),

    'allowed_origins_patterns' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS_PATTERNS', ''))
    ))),

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
