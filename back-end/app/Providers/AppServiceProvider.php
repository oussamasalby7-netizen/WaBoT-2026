<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * Security: suppress implicit framework/PHP version disclosure headers.
     * SonarQube S5689 — "This framework implicitly discloses version information."
     * The X-Powered-By header advertises the PHP version to any HTTP client,
     * giving attackers a fingerprinting vector. Removing it at the application
     * layer ensures it is suppressed regardless of the web-server configuration.
     */
    public function boot(): void
    {
        // Remove the PHP/framework version disclosure header on every response.
        header_remove('X-Powered-By');

        // Belt-and-suspenders: also disable via ini at runtime.
        @ini_set('expose_php', 'Off');
    }
}
