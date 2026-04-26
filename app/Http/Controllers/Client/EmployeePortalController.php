<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class EmployeePortalController extends Controller
{
    private function activeCycle(): ?object
    {
        return DB::table('academic_year')
            ->where('is_activated', 1)
            ->orderByDesc('from_year')
            ->first();
    }

    private function semesterLabel(?string $term): string
    {
        $t = strtolower(trim((string) $term));

        return match (true) {
            str_contains($t, 'summer') => 'Summer',
            str_contains($t, '2nd')    => '2nd Semester',
            default                    => '1st Semester',
        };
    }

    private function termOptions(?string $term): array
    {
        return match (strtolower(trim((string) $term))) {
            '2nd', '2nd sem' => ['2nd', '2nd Sem'],
            'summer'         => ['Summer', 'Summer'],
            default          => ['1st', '1st Sem'],
        };
    }

    private function questionnaireTypeIdForCategory(string $category): ?int
    {
        if (! Schema::hasTable('questionnaire_type')) {
            return null;
        }

        $code = $category === 'head' ? 'QTYPE-HEAD' : 'QTYPE-EMPLOYEE';
        $id = DB::table('questionnaire_type')->where('code', $code)->value('id');

        return $id ? (int) $id : null;
    }

    private function ratingsForCycle(int $employeeId, int $academicYearId): array
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $rows = DB::table('evaluation_submissions as es')
            ->select(
                'es.questionnaire_type_id',
                'es.answers',
                'es.submitted_at'
            )
            ->where('es.academic_year_id', $academicYearId)
            ->when(Schema::hasColumn('evaluation_submissions', 'employee_id'), fn ($query) => $query->where('es.employee_id', $employeeId))
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        $questionBuckets = [];
        $count           = $rows->count();

        foreach ($rows as $row) {
            $answers = json_decode($row->answers ?? '[]', true);
            foreach ($answers as $ans) {
                $qid = $ans['question_id'] ?? null;
                if ($qid) {
                    $questionBuckets[$qid] ??= [];
                    $questionBuckets[$qid][] = (int) ($ans['rating'] ?? 0);
                }
            }
        }

        $questionIds = collect(array_keys($questionBuckets))
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->values();
        $questionDetails = $questionIds->isNotEmpty() && Schema::hasTable('question')
            ? DB::table('question')
                ->leftJoin('question_class as qc', 'qc.id', '=', 'question.question_class_id')
                ->whereIn('question.id', $questionIds->all())
                ->select('question.id', 'question.description', 'qc.name as class_name')
                ->get()
                ->keyBy('id')
            : collect();

        $avgRatings = [];
        foreach ($questionBuckets as $qid => $ratings) {
            $question = $questionDetails->get((int) $qid);

            $avgRatings[] = [
                'question_id' => (int) $qid,
                'question_text' => $question->description ?? ('Question #' . $qid),
                'class_name' => $question->class_name ?? 'General',
                'avg_rating' => round(array_sum($ratings) / max(1, count($ratings)), 2),
                'response_count' => count($ratings),
            ];
        }

        usort($avgRatings, fn ($a, $b) => $a['question_id'] <=> $b['question_id']);

        $classRatings = collect($avgRatings)
            ->groupBy(fn (array $question) => $question['class_name'] ?: 'General')
            ->map(function ($questions, string $className) {
                return [
                    'class_name' => $className,
                    'avg_rating' => round($questions->avg('avg_rating'), 2),
                    'question_count' => $questions->count(),
                    'response_count' => $questions->sum('response_count'),
                    'questions' => $questions->values()->all(),
                ];
            })
            ->values()
            ->all();

        return [
            'submission_count' => $count,
            'overall_avg'      => $count > 0 ? round(array_sum(array_column($avgRatings, 'avg_rating')) / max(1, count($avgRatings)), 2) : 0,
            'latest_submitted_at' => $rows->max('submitted_at'),
            'per_question'     => $avgRatings,
            'class_ratings'    => $classRatings,
        ];
    }

    private function pendingTargets(int $employeeId, int $academicYearId): array
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $me = DB::table('employee')->where('id', $employeeId)->first();
        if (! $me) {
            return [];
        }

        $submitted = DB::table('evaluation_submissions')
            ->where('academic_year_id', $academicYearId)
            ->when(Schema::hasColumn('evaluation_submissions', 'employee_id'), fn ($query) => $query->whereNotNull('employee_id'))
            ->pluck('employee_id')
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->values()
            ->toArray();

        $peers = DB::table('employee')
            ->where('id', '!=', $employeeId)
            ->where('department_id', $me->department_id)
            ->where('branch_id', $me->branch_id)
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->select('id', 'firstname', 'lastname', 'role')
            ->get()
            ->map(fn ($p) => [
                'id'       => $p->id,
                'name'     => trim("{$p->firstname} {$p->lastname}"),
                'role'     => $p->role ?? 'Employee',
                'category' => str_contains(strtolower($p->role ?? ''), 'head') ? 'head' : 'peer_employee',
                'done'     => in_array($p->id, $submitted, true),
            ])
            ->toArray();

        return $peers;
    }

    public function evaluateForm(Request $request): Response|RedirectResponse
    {
        $employeeId = (int) session('client_id');
        $evaluateeId = (int) $request->query('evaluatee_id');
        $category    = $request->query('category', 'peer_employee');
        $cycle       = $this->activeCycle();

        if (! Schema::hasTable('evaluation_submissions')) {
            return redirect()->route('portal.employee.dashboard')
                ->with('error', 'Submissions storage is not available yet.');
        }

        if (! $cycle) {
            return redirect()->route('portal.employee.dashboard')->with('error', 'No active evaluation cycle.');
        }

        $evaluatee = DB::table('employee')->where('id', $evaluateeId)->first();
        if (! $evaluatee) {
            return redirect()->route('portal.employee.dashboard')->with('error', 'Evaluatee not found.');
        }

        $questions = DB::table('question')
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->when($category === 'head', fn ($q) => $q->whereIn('question_type_id',
                DB::table('question_type')->where('code', 'like', '%head%')->pluck('id')))
            ->when($category !== 'head', fn ($q) => $q->whereIn('question_type_id',
                DB::table('question_type')->where('code', 'like', '%employee%')->pluck('id')))
            ->select('id as question_id', 'description as question_text')
            ->orderBy('id')
            ->get();

        return Inertia::render('Employee/EvaluateForm', [
            'category'  => $category,
            'evaluatee' => [
                'id'   => $evaluatee->id,
                'name' => trim("{$evaluatee->firstname} {$evaluatee->lastname}"),
                'role' => $evaluatee->role ?? 'Employee',
            ],
            'questions' => $questions,
            'cycle'     => [
                'id'          => $cycle->id,
                'school_year' => "{$cycle->from_year}-{$cycle->to_year}",
                'semester'    => $this->semesterLabel($cycle->term),
                'term'        => $cycle->term,
            ],
        ]);
    }

    public function submitEvaluation(Request $request): RedirectResponse
    {
        $employeeId = (int) session('client_id');

        $data = $request->validate([
            'category'          => 'required|in:peer_employee,head',
            'evaluatee_id'      => 'required|integer',
            'academic_year_id'  => 'required|integer',
            'answers'           => 'required|array|min:1',
            'answers.*.question_id' => 'required|integer',
            'answers.*.rating'      => 'required|integer|between:1,5',
            'comments'          => 'nullable|string|max:2000',
        ]);

        if (! Schema::hasTable('evaluation_submissions')) {
            return back()->withErrors(['message' => 'Submissions storage is not available.']);
        }

        $already = DB::table('evaluation_submissions')
            ->where('academic_year_id', $data['academic_year_id'])
            ->when(Schema::hasColumn('evaluation_submissions', 'employee_id'), fn ($query) => $query->where('employee_id', $data['evaluatee_id']))
            ->when($this->questionnaireTypeIdForCategory($data['category']), fn ($query, $typeId) => $query->where('questionnaire_type_id', $typeId))
            ->exists();

        if ($already) {
            return redirect()->route('portal.employee.dashboard')->with('error', 'You have already submitted this evaluation.');
        }

        $ratings = array_column($data['answers'], 'rating');
        $avg     = count($ratings) ? round(array_sum($ratings) / count($ratings), 2) : 0;

        $submissionPayload = [
            'academic_year_id'  => $data['academic_year_id'],
            'questionnaire_type_id' => $this->questionnaireTypeIdForCategory($data['category']),
            'answers'           => json_encode($data['answers']),
            'comments'          => json_encode(($data['comments'] ?? null) ? ['text' => $data['comments']] : []),
            'created_at'        => now(),
            'updated_at'        => now(),
        ];

        if (Schema::hasColumn('evaluation_submissions', 'employee_id')) {
            $submissionPayload['employee_id'] = $data['evaluatee_id'];
        }

        if (Schema::hasColumn('evaluation_submissions', 'overall_average')) {
            $submissionPayload['overall_average'] = $avg;
        }

        if (Schema::hasColumn('evaluation_submissions', 'submitted_at')) {
            $submissionPayload['submitted_at'] = now();
        }

        DB::table('evaluation_submissions')->insert($submissionPayload);

        $targetTable = $data['category'] === 'head' ? 'ratings_head' : 'ratings_employee';
        $targetCol   = 'employee_id';

        $existing = DB::table($targetTable)
            ->where('academic_year_id', $data['academic_year_id'])
            ->where($targetCol, $data['evaluatee_id'])
            ->first();

        $newItems = collect($data['answers'])
            ->groupBy('question_id')
            ->map(fn ($g) => round($g->avg('rating'), 2))
            ->toArray();

        if ($existing) {
            $count    = ((int) $existing->submission_count) + 1;
            $prev     = json_decode($existing->item_ratings ?? '{}', true) ?: [];
            $combined = [];
            foreach ($newItems as $qid => $r) {
                $combined[$qid] = round((($prev[$qid] ?? 0) * ($count - 1) + $r) / $count, 2);
            }
            $overall = count($combined) ? round(array_sum($combined) / count($combined), 2) : 0;

            DB::table($targetTable)->where('id', $existing->id)->update([
                'submission_count' => $count,
                'item_ratings'     => json_encode($combined),
                'overall_ratings'  => json_encode(['average' => $overall]),
                'updated_at'       => now(),
            ]);
        } else {
            $overall = count($newItems) ? round(array_sum($newItems) / count($newItems), 2) : 0;
            DB::table($targetTable)->insert([
                'academic_year_id' => $data['academic_year_id'],
                $targetCol         => $data['evaluatee_id'],
                'submission_count' => 1,
                'item_ratings'     => json_encode($newItems),
                'overall_ratings'  => json_encode(['average' => $overall]),
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
        }

        return redirect()->route('portal.employee.dashboard')->with('success', 'Evaluation submitted. Thank you!');
    }

    public function dashboard(): Response
    {
        $employeeId = (int) session('client_id');
        $employee   = Employee::with(['branch', 'department'])
            ->findOrFail($employeeId);

        $cycle          = $this->activeCycle();
        $currentRatings = [];
        $archiveFolders = [];

        if ($cycle) {
            $currentRatings = $this->ratingsForCycle($employeeId, (int) $cycle->id);

            $pastCycles = DB::table('academic_year')
                ->where('is_activated', 0)
                ->where('is_deleted', 0)
                ->orderByDesc('from_year')
                ->get();

            foreach ($pastCycles as $pastCycle) {
                $pastYear    = trim("{$pastCycle->from_year}-{$pastCycle->to_year}");
                $ratings     = $this->ratingsForCycle($employeeId, (int) $pastCycle->id);

                if (! empty($ratings)) {
                    $archiveFolders[] = [
                        'label'       => "{$pastYear} {$this->semesterLabel($pastCycle->term ?? null)}",
                        'school_year' => $pastYear,
                        'semester'    => $this->semesterLabel($pastCycle->term ?? null),
                        'ratings'     => $ratings,
                    ];
                }
            }
        }

        return Inertia::render('Employee/Dashboard', [
            'employee' => [
                'id'          => $employee->id,
                'name'        => $employee->full_name,
                'employee_no' => $employee->employee_no,
                'branch'      => $employee->branch?->name ?? '',
                'department'  => $employee->department?->name ?? '',
                'email'       => $employee->email ?? '',
                'role'        => $employee->role ?? 'Employee',
                'photo_url'   => $employee->profile_photo_path ? Storage::disk('public')->url($employee->profile_photo_path) : null,
            ],
            'cycle'          => $cycle ? [
                'school_year' => "{$cycle->from_year}-{$cycle->to_year}",
                'semester'    => $this->semesterLabel($cycle->term ?? null),
                'is_open'     => (bool) $cycle->is_activated,
            ] : null,
            'currentRatings' => $currentRatings,
            'archiveFolders' => $archiveFolders,
        ]);
    }
}
