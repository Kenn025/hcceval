<?php

namespace App\Services;

use App\Notifications\EvaluationWindowClosed;
use App\Notifications\EvaluationWindowOpened;
use App\Notifications\IncompleteEvaluationReminder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class EvaluationNotifier
{
    public function windowOpened(string $schoolYear, string $semester, ?int $branchId = null): int
    {
        $title     = "Evaluation Window Open — {$schoolYear} {$semester}";
        $body      = "The evaluation window for {$schoolYear}, {$semester} is now open. Please complete your evaluations before it closes.";
        $actionUrl = url('/portal/login');

        foreach (['student', 'teacher', 'employee'] as $type) {
            AppNotifier::broadcast($type, 'eval.window_opened', $title, $body, $actionUrl, $branchId);
        }

        AppNotifier::notifyAdmins('eval.window_opened', $title,
            "Evaluation cycle activated for {$schoolYear}, {$semester}. Notifications have been dispatched to all users.",
            url('/admin/evaluation-cycle'), $branchId);

        return $this->fanout($branchId, new EvaluationWindowOpened($schoolYear, $semester, $actionUrl));
    }

    public function windowClosed(string $schoolYear, string $semester, ?int $branchId = null): int
    {
        $title = "Evaluation Window Closed — {$schoolYear} {$semester}";
        $body  = "The evaluation window for {$schoolYear}, {$semester} has closed. Results will be published once processing is complete.";

        foreach (['student', 'teacher', 'employee'] as $type) {
            AppNotifier::broadcast($type, 'eval.window_closed', $title, $body, null, $branchId);
        }

        AppNotifier::notifyAdmins('eval.window_closed', $title,
            "Evaluation cycle closed for {$schoolYear}, {$semester}.",
            url('/admin/evaluation-cycle'), $branchId);

        return $this->fanout($branchId, new EvaluationWindowClosed($schoolYear, $semester));
    }

    public function remindIncomplete(int $userId, string $email, string $schoolYear, string $semester, int $pending): bool
    {
        AppNotifier::record(
            'student',
            $userId,
            $email,
            'eval.reminder',
            "{$pending} pending evaluation" . ($pending === 1 ? '' : 's'),
            "You still have {$pending} pending evaluation" . ($pending === 1 ? '' : 's') . " for {$schoolYear}, {$semester}. Please complete them before the window closes.",
            url('/portal/login'),
        );

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
