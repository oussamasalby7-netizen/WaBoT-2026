<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;
    public string $userName;

    /**
     * Create a new OTP verification mail instance.
     *
     * @param string $otp      The 6-digit code
     * @param string $userName The recipient's display name
     */
    public function __construct(string $otp, string $userName)
    {
        $this->otp      = $otp;
        $this->userName = $userName;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your WaBoT Verification Code',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.otp-verification',
            with: [
                'otp'      => $this->otp,
                'userName' => $this->userName,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
