<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EvaluationWindowClosed extends Notification
{
    use Queueable;

    public function __construct(
        public string $schoolYear,
        public string $semester,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Evaluation Window Closed — {$this->schoolYear} {$this->semester}")
            ->greeting('Hello,')
            ->line("The evaluation window for **{$this->schoolYear}, {$this->semester}** has closed.")
            ->line('Results will be published once processing is complete.')
            ->line('Thank you for your participation.');
    }
}
