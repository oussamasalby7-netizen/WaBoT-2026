<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WaBoT — Verification Code</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: #0b0f19;
      color: #f1f5f9;
      min-height: 100vh;
      padding: 40px 16px;
    }
    .wrapper {
      max-width: 520px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background-color: #00ff88;
      border-radius: 14px;
      font-weight: 800;
      font-size: 28px;
      color: #000;
      margin-bottom: 16px;
    }
    .brand-name {
      font-size: 22px;
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: -0.5px;
    }
    .card {
      background-color: #111827;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      padding: 40px 36px;
      text-align: center;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 8px;
    }
    .greeting {
      font-size: 15px;
      color: #94a3b8;
      margin-bottom: 32px;
      line-height: 1.6;
    }
    .otp-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 16px;
    }
    .otp-block {
      display: inline-block;
      background-color: #1a2236;
      border: 2px solid rgba(0,255,136,0.3);
      border-radius: 16px;
      padding: 20px 40px;
      margin-bottom: 28px;
    }
    .otp-code {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #00ff88;
      font-variant-numeric: tabular-nums;
    }
    .expiry {
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 32px;
    }
    .expiry strong {
      color: #f59e0b;
    }
    .divider {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.08);
      margin: 28px 0;
    }
    .footer-note {
      font-size: 12px;
      color: #475569;
      line-height: 1.7;
    }
    .footer-note a {
      color: #64748b;
      text-decoration: none;
    }
    .footer {
      text-align: center;
      margin-top: 28px;
      font-size: 12px;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">W</div>
      <p class="brand-name">WaBoT</p>
    </div>

    <div class="card">
      <h1 class="title">Verify your email</h1>
      <p class="greeting">
        Hello <strong>{{ $userName }}</strong>,<br />
        Use the code below to complete your WaBoT registration.
      </p>

      <p class="otp-label">Your verification code</p>
      <div class="otp-block">
        <span class="otp-code">{{ $otp }}</span>
      </div>

      <p class="expiry">
        This code expires in <strong>10 minutes</strong>.
      </p>

      <hr class="divider" />

      <p class="footer-note">
        If you did not request this code, you can safely ignore this email.
        No account will be created without entering this code.<br /><br />
        For security, never share this code with anyone.
      </p>
    </div>

    <div class="footer">
      &copy; {{ date('Y') }} WaBoT — Automated WhatsApp Sales Platform
    </div>
  </div>
</body>
</html>
