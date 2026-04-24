<?php

namespace App\Services;

use App\Notifications\EvaluationWindowClosed;
use App\Notifications\EvaluationWindowOpened;
use App\Notifications\IncompleteEvaluationReminder;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class EvaluationNotifier
{
    public function windowOpened(string $schoolYear, string $semester, ?int $branchId = null): int
    {
        return $this->fanout(
            $branchId,
            new EvaluationWindowOpened($schoolYear, $semester, url('/portal/login')),
        );
    }

    public function windowClosed(string $schoolYear, string $semester, ?int $branchId = null): int
    {
        return $this->fanout(
            $branchId,
            new EvaluationWindowClosed($schoolYear, $semester),
        );
    }

    public function remindIncomplete(int $userId, string $email, string $schoolYear, string $semester, int $pending): bool
    {
        try {
            Notification::route('mail', $email)
                ->notify(new IncompleteEvaluationReminder($schoolYear, $semester, $pending, url('/portal/login')));
            return true;
        } catch (\Throwable $e) {
            Log::warning('Failed to send reminder to ' . $email . ': ' . $e->getMessage());
            return false;
        }
    }

    private function fanout(?int $branchId, object $notification): int
    {
        $sent = 0;
        $recipients = collect();

        foreach (['student', 'teacher', 'employee'] as $table) {
            $q = DB::table($table)
                ->where('is_activated', 1)
                ->where('is_deleted', 0)
                ->whereNotNull('email')
                ->where('email', '!=', '');

            if ($branchId) {
                $q->where('branch_id', $branchId);
            }

            $recipients = $recipients->merge($q->pluck('email'));
        }

        $recipients = $recipients->filter(fn ($e) => filter_var($e, FILTER_VALIDATE_EMAIL))->unique()->values();

        foreach ($recipients as $email) {
            try {
                Notification::route('mail', $email)->notify($notification);
                $sent++;
            } catch (\Throwable $e) {
                Log::warning('Fanout email failed to ' . $email . ': ' . $e->getMessage());
            }
        }

        return $sent;
    }
}
