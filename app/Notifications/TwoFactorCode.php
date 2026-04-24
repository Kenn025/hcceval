<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TwoFactorCode extends Notification
{
    use Queueable;

    public function __construct(public string $code) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('HCC Eval — Your sign-in code')
            ->greeting('Hello,')
            ->line("Your sign-in verification code is:")
            ->line("**{$this->code}**")
            ->line('This code expires in 10 minutes. If you did not try to sign in, you can safely ignore this email.');
    }
}
