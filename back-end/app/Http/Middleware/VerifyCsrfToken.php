<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * Justification for each exclusion (SonarQube S4502 — reviewed and safe):
     *
     *  • 'webhook'
     *      Meta (WhatsApp Cloud API) sends server-side POST callbacks to this
     *      URL without a browser session or CSRF token. CSRF is not applicable
     *      to server-to-server webhooks. The payload is authenticated instead
     *      via the X-Hub-Signature-256 header and our WHATSAPP_VERIFY_TOKEN.
     *      Only the exact path `/webhook` is matched — no sub-paths.
     *
     * Note: Stripe and Baileys routes are registered under the `api` middleware
     * group, which does NOT include VerifyCsrfToken at all — no exclusion is
     * needed for those routes.
     *
     * @var array<int, string>
     */
    protected $except = [
        'webhook',   // Meta WhatsApp Cloud API — server-to-server, token-authenticated // NOSONAR
    ];
}
