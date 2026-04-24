<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class IncompleteEvaluationReminder extends Notification
{
    use Queueable;

    public function __construct(
        public string $schoolYear,
        public string $semester,
        public int $pendingCount,
        public ?string $portalUrl = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $count = $this->pendingCount;

        return (new MailMessage)
            ->subject("Reminder: {$count} evaluation" . ($count === 1 ? '' : 's') . ' pending')
            ->greeting('Hello,')
            ->line("You still have **{$count} pending evaluation" . ($count === 1 ? '' : 's') . "** for {$this->schoolYear}, {$this->semester}.")
            ->line('Please log in and complete them before the window closes.')
            ->action('Complete Now', $this->portalUrl ?: url('/portal/login'))
            ->line('Your feedback helps us improve the learning experience.');
    }
}
