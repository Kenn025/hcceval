<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ClientPasswordReset extends Notification
{
    use Queueable;

    public function __construct(
        public string $token,
        public string $email,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url('/portal/password/reset?token=' . $this->token . '&email=' . urlencode($this->email));

        return (new MailMessage)
            ->subject('Reset your HCC Eval password')
            ->greeting('Password reset requested')
            ->line('We received a request to reset your HCC Eval account password.')
            ->action('Reset Password', $url)
            ->line('If you did not request a password reset, no action is required.')
            ->line('This link expires in 60 minutes.');
    }
}
