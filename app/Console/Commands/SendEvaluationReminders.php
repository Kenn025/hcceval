<?php

namespace App\Console\Commands;

use App\Services\EvaluationNotifier;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SendEvaluationReminders extends Command
{
    protected $signature = 'eval:remind {--branch= : Limit to a specific branch_id}';

    protected $description = 'Email students/faculty who still have pending evaluations in the active cycle';

    public function handle(EvaluationNotifier $notifier): int
    {
        $cycle = DB::table('academic_year')
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->orderByDesc('from_year')
            ->first();

        if (! $cycle) {
            $this->warn('No active evaluation cycle; skipping.');
            return self::SUCCESS;
        }

        if (! Schema::hasTable('evaluation_submissions')) {
            $this->warn('evaluation_submissions table not present; skipping.');
            return self::SUCCESS;
        }

        $schoolYear = "{$cycle->from_year}-{$cycle->to_year}";
        $semester   = $cycle->term;
        $branchId   = $this->option('branch') ? (int) $this->option('branch') : null;

        $sent = $this->remindStudents($notifier, $schoolYear, $semester, $branchId);
        $this->info("Sent student reminders: {$sent}");

        return self::SUCCESS;
    }

    private function remindStudents(EvaluationNotifier $notifier, string $schoolYear, string $semester, ?int $branchId): int
    {
        if (! Schema::hasTable('student_enrollments') || ! Schema::hasTable('subject_sections')) {
            return 0;
        }

        $students = DB::table('student as s')
            ->where('s.is_activated', 1)
            ->where('s.is_deleted', 0)
            ->whereNotNull('s.email')
            ->when($branchId, fn ($q) => $q->where('s.branch_id', $branchId))
            ->select('s.id', 's.email')
            ->get();

        $count = 0;

        foreach ($students as $student) {
            $expected = DB::table('student_enrollments as se')
                ->join('subject_sections as ss', 'ss.id', '=', 'se.subject_section_id')
                ->where('se.student_id', $student->id)
                ->where('se.status', 'enrolled')
                ->where('ss.school_year', $schoolYear)
                ->where('ss.is_active', 1)
                ->count();

            $submitted = DB::table('evaluation_submissions')
                ->where('evaluator_id', $student->id)
                ->where('evaluator_type', 'student')
                ->where('school_year', $schoolYear)
                ->count();

            $pending = max(0, $expected - $submitted);

            if ($pending > 0 && filter_var($student->email, FILTER_VALIDATE_EMAIL)) {
                if ($notifier->remindIncomplete($student->id, $student->email, $schoolYear, $semester, $pending)) {
                    $count++;
                }
            }
        }

        return $count;
    }
}
