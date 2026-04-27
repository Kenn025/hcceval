<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\EvaluationCycleRequest;
use App\Services\AuditLogger;
use App\Services\DepartmentEvaluationWindow;
use App\Services\EvaluationNotifier;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class EvaluationCycleController extends Controller
{
    public function index()
    {
        $submissionStats = $this->submissionStatsByAcademicYear();
        $questionTotals = $this->questionTotalsByAcademicYear();
        $hasSummaryColumns = Schema::hasColumns('academic_year', [
            'total_assigned_questions',
            'total_evaluation_submitted',
            'date_opened',
            'date_closed',
        ]);

        if ($hasSummaryColumns) {
            $this->syncAcademicYearSummaries($submissionStats, $questionTotals);
        }

        $select = [
                'id as year_id',
                'from_year as year_start',
                'to_year as year_end',
                'term as semester',
                'created_at as opened_at',
                'updated_at as updated_at',
                DB::raw("CONCAT(from_year, '-', to_year) as school_year"),
                DB::raw("CASE WHEN is_deleted = 1 THEN 'closed' WHEN is_activated = 1 THEN 'active' ELSE 'inactive' END as status")
        ];

        if ($hasSummaryColumns) {
            $select = array_merge($select, [
                'total_assigned_questions as stored_total_assigned_questions',
                'total_evaluation_submitted as stored_total_evaluation_submitted',
                'date_opened as stored_date_opened',
                'date_closed as stored_date_closed',
            ]);
        }

        $cycles = DB::table('academic_year')
            ->select($select)
            ->orderByDesc('from_year')
            ->orderByDesc('id')
            ->get()
            ->map(function (object $cycle) use ($submissionStats, $questionTotals, $hasSummaryColumns) {
                $stats = $submissionStats[(int) $cycle->year_id] ?? ['submissions' => 0, 'submitted_questions' => 0];

                return [
                    'year_id' => (int) $cycle->year_id,
                    'year_start' => (int) $cycle->year_start,
                    'year_end' => (int) $cycle->year_end,
                    'semester' => $cycle->semester,
                    'school_year' => $cycle->school_year,
                    'status' => $cycle->status,
                    'total_assigned_questions' => $hasSummaryColumns
                        ? (int) $cycle->stored_total_assigned_questions
                        : (int) ($questionTotals[(int) $cycle->year_id] ?? 0),
                    'total_evaluation_submitted' => $hasSummaryColumns
                        ? (int) $cycle->stored_total_evaluation_submitted
                        : (int) $stats['submissions'],
                    'opened_at' => $hasSummaryColumns ? $cycle->stored_date_opened : $cycle->opened_at,
                    'closed_at' => $hasSummaryColumns ? $cycle->stored_date_closed : ($cycle->status === 'closed' ? $cycle->updated_at : null),
                ];
            });

        $activeCycle = $cycles->firstWhere('status', 'active');

        return Inertia::render('Admin/EvaluationCycle', [
            'cycles'      => $cycles,
            'activeCycle' => $activeCycle,
            'hasOpenEvaluationWindow' => DepartmentEvaluationWindow::hasOpenWindow($this->scopedBranchId()),
        ]);
    }

    public function store(EvaluationCycleRequest $request, EvaluationNotifier $notifier)
    {
        $validated = $request->validated();

        if ($this->hasRunningEvaluationWindow()) {
            return back()->with('error', 'Academic year cannot be changed while an evaluation is currently open. Close all running evaluations first.');
        }

        if ($validated['status'] === 'active') {
            DB::table('academic_year')->update(['is_activated' => 0]);
        }

        DB::table('academic_year')->insert([
            'from_year'    => $validated['year_start'],
            'to_year'      => $validated['year_end'],
            'term'         => $validated['semester'],
            'is_activated' => $validated['status'] === 'active' ? 1 : 0,
            'is_deleted'   => $validated['status'] === 'closed' ? 1 : 0,
            'date_opened'  => now(),
            'date_closed'  => $validated['status'] === 'closed' ? now() : null,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        if ($validated['status'] === 'active') {
            $notifier->windowOpened(
                "{$validated['year_start']}-{$validated['year_end']}",
                $validated['semester'],
                $this->scopedBranchId(),
            );
        }

        AuditLogger::record('evaluation_cycle.created', 'academic_year', null, $validated);

        return back()->with('success', 'Evaluation cycle created.');
    }

    public function update(EvaluationCycleRequest $request, int $id, EvaluationNotifier $notifier)
    {
        $validated = $request->validated();

        if ($this->hasRunningEvaluationWindow()) {
            return back()->with('error', 'Academic year cannot be changed while an evaluation is currently open. Close all running evaluations first.');
        }

        $previous = DB::table('academic_year')->where('id', $id)->first();

        if ($validated['status'] === 'active') {
            DB::table('academic_year')->where('id', '!=', $id)->update(['is_activated' => 0]);
        }

        $openedAt = $validated['status'] === 'active'
            ? Carbon::parse($validated['date_opened'] ?? now())
            : ($previous?->date_opened ?? now());

        DB::table('academic_year')->where('id', $id)->update([
            'from_year'    => $validated['year_start'],
            'to_year'      => $validated['year_end'],
            'term'         => $validated['semester'],
            'is_activated' => $validated['status'] === 'active' ? 1 : 0,
            'is_deleted'   => $validated['status'] === 'closed' ? 1 : 0,
            'date_opened'  => $openedAt,
            'date_closed'  => $validated['status'] === 'closed' ? now() : null,
            'updated_at'   => now(),
        ]);

        $yearLabel = "{$validated['year_start']}-{$validated['year_end']}";
        $branch    = $this->scopedBranchId();

        if ($previous && ! $previous->is_activated && $validated['status'] === 'active') {
            $notifier->windowOpened($yearLabel, $validated['semester'], $branch);
        } elseif ($previous && $previous->is_activated && $validated['status'] !== 'active') {
            $notifier->windowClosed($yearLabel, $validated['semester'], $branch);
        }

        AuditLogger::record('evaluation_cycle.updated', 'academic_year', $id, $validated);

        return back()->with('success', 'Evaluation cycle updated.');
    }

    public function destroy(int $id, EvaluationNotifier $notifier)
    {
        if ($this->hasRunningEvaluationWindow()) {
            return back()->with('error', 'Academic year cannot be changed while an evaluation is currently open. Close all running evaluations first.');
        }

        $cycle = DB::table('academic_year')->where('id', $id)->first();

        DB::table('academic_year')->where('id', $id)->update([
            'is_deleted' => 1,
            'is_activated' => 0,
            'date_closed' => now(),
            'updated_at' => now(),
        ]);

        if ($cycle && $cycle->is_activated) {
            $notifier->windowClosed(
                "{$cycle->from_year}-{$cycle->to_year}",
                $cycle->term,
                $this->scopedBranchId(),
            );
        }

        AuditLogger::record('evaluation_cycle.deleted', 'academic_year', $id);

        return back()->with('success', 'Evaluation cycle deleted.');
    }

    private function hasRunningEvaluationWindow(): bool
    {
        return DepartmentEvaluationWindow::hasOpenWindow($this->scopedBranchId());
    }

    private function submissionStatsByAcademicYear(): array
    {
        return DB::table('evaluation_submissions')
            ->select('academic_year_id', 'answers')
            ->whereNotNull('academic_year_id')
            ->get()
            ->groupBy('academic_year_id')
            ->map(function ($rows) {
                return [
                    'submissions' => $rows->count(),
                    'submitted_questions' => $rows->sum(function (object $row) {
                        $answers = json_decode((string) $row->answers, true);

                        return is_array($answers) ? count($answers) : 0;
                    }),
                ];
            })
            ->all();
    }

    private function syncAcademicYearSummaries(array $submissionStats, array $questionTotals): void
    {
        DB::table('academic_year')
            ->select('id')
            ->get()
            ->each(function (object $cycle) use ($submissionStats, $questionTotals) {
                $stats = $submissionStats[(int) $cycle->id] ?? ['submissions' => 0, 'submitted_questions' => 0];

                DB::table('academic_year')->where('id', $cycle->id)->update([
                    'total_assigned_questions' => (int) ($questionTotals[(int) $cycle->id] ?? 0),
                    'total_evaluation_submitted' => (int) $stats['submissions'],
                ]);
            });
    }

    private function questionTotalsByAcademicYear(): array
    {
        $questionnaireQuestionCounts = DB::table('questionnaires')
            ->select('id', 'items')
            ->get()
            ->mapWithKeys(fn (object $questionnaire) => [
                (int) $questionnaire->id => $this->countQuestionnaireQuestions($questionnaire->items),
            ]);

        return DB::table('questionnaire_distribution')
            ->select('academic_year_id', 'questionnaire_id')
            ->where('is_deleted', 0)
            ->whereNotNull('academic_year_id')
            ->get()
            ->groupBy('academic_year_id')
            ->map(fn ($rows) => $rows->sum(
                fn (object $row) => (int) ($questionnaireQuestionCounts[(int) $row->questionnaire_id] ?? 0)
            ))
            ->all();
    }

    private function countQuestionnaireQuestions(?string $items): int
    {
        $payload = json_decode((string) $items, true);

        if (! is_array($payload)) {
            return 0;
        }

        $scaleQuestions = collect($payload['scale_questions'] ?? [])
            ->flatMap(fn ($group) => $group['questions'] ?? [])
            ->map(fn ($question) => (int) ($question['question_id'] ?? $question))
            ->filter();

        $commentQuestions = collect(data_get($payload, 'comment_section.questions', []))
            ->map(fn ($question) => (int) ($question['question_id'] ?? $question))
            ->filter();

        return $scaleQuestions->merge($commentQuestions)->unique()->count();
    }
}
