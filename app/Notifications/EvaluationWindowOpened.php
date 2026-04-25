<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EvaluationWindowOpened extends Notification
{
    use Queueable;

    public function __construct(
        public string $schoolYear,
        public string $semester,
        public ?string $portalUrl = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Evaluation Window Open — {$this->schoolYear} {$this->semester}")
            ->greeting('Hello,')
            ->line("The evaluation window for **{$this->schoolYear}, {$this->semester}** is now open.")
            ->line('Please log in to the portal and complete your evaluations before the window closes.')
            ->action('Open Portal', $this->portalUrl ?: url('/portal/login'))
            ->line('Thank you for your participation.');
    }
}
