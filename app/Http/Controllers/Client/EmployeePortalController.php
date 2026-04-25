<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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

    private function ratingsForCycle(int $employeeId, string $schoolYear, array $terms): array
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $rows = DB::table('evaluation_submissions as es')
            ->select(
                'es.category',
                'es.answers',
                'es.submitted_at'
            )
            ->where('es.evaluatee_id', $employeeId)
            ->where('es.school_year', $schoolYear)
            ->whereIn('es.term', $terms)
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        $totalRatings = [];
        $count        = $rows->count();

        foreach ($rows as $row) {
            $answers = json_decode($row->answers ?? '[]', true);
            foreach ($answers as $ans) {
                $qid = $ans['question_id'] ?? null;
                if ($qid) {
                    $totalRatings[$qid] = ($totalRatings[$qid] ?? 0) + ($ans['rating'] ?? 0);
                }
            }
        }

        $avgRatings = [];
        foreach ($totalRatings as $qid => $total) {
            $avgRatings[] = ['question_id' => $qid, 'avg_rating' => round($total / $count, 2)];
        }

        return [
            'submission_count' => $count,
            'overall_avg'      => $count > 0 ? round(array_sum(array_column($avgRatings, 'avg_rating')) / max(1, count($avgRatings)), 2) : 0,
            'per_question'     => $avgRatings,
        ];
    }

    private function pendingTargets(int $employeeId, string $schoolYear, array $terms): array
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $me = DB::table('employee')->where('id', $employeeId)->first();
        if (! $me) {
            return [];
        }

        $submitted = DB::table('evaluation_submissions')
            ->where('evaluator_id', $employeeId)
            ->where('evaluator_type', 'employee')
            ->where('school_year', $schoolYear)
            ->whereIn('term', $terms)
            ->pluck('evaluatee_id', 'id')
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
            'school_year'       => 'required|string|max:20',
            'term'              => 'required|string|max:50',
            'answers'           => 'required|array|min:1',
            'answers.*.question_id' => 'required|integer',
            'answers.*.rating'      => 'required|integer|between:1,5',
            'comments'          => 'nullable|string|max:2000',
        ]);

        if (! Schema::hasTable('evaluation_submissions')) {
            return back()->withErrors(['message' => 'Submissions storage is not available.']);
        }

        $already = DB::table('evaluation_submissions')
            ->where('evaluator_id', $employeeId)
            ->where('evaluator_type', 'employee')
            ->where('evaluatee_id', $data['evaluatee_id'])
            ->where('school_year', $data['school_year'])
            ->where('term', $data['term'])
            ->where('category', $data['category'])
            ->exists();

        if ($already) {
            return redirect()->route('portal.employee.dashboard')->with('error', 'You have already submitted this evaluation.');
        }

        $ratings = array_column($data['answers'], 'rating');
        $avg     = count($ratings) ? round(array_sum($ratings) / count($ratings), 2) : 0;

        DB::table('evaluation_submissions')->insert([
            'evaluator_id'      => $employeeId,
            'evaluator_type'    => 'employee',
            'evaluatee_id'      => $data['evaluatee_id'],
            'evaluatee_type'    => 'employee',
            'category'          => $data['category'],
            'subject_section_id'=> null,
            'academic_year_id'  => $data['academic_year_id'],
            'school_year'       => $data['school_year'],
            'term'              => $data['term'],
            'answers'           => json_encode($data['answers']),
            'comments'          => $data['comments'] ?? null,
            'overall_average'   => $avg,
            'submitted_at'      => now(),
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        $targetTable = $data['category'] === 'head' ? 'ratings_head' : 'ratings_employee';
        $targetCol   = $data['category'] === 'head' ? 'teacher_id'    : 'employee_id';

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
        $pendingTargets = [];

        if ($cycle) {
            [$termA, $termB] = $this->termOptions($cycle->term ?? null);
            $schoolYear      = trim("{$cycle->from_year}-{$cycle->to_year}");

            $currentRatings = $this->ratingsForCycle($employeeId, $schoolYear, [$termA, $termB]);
            $pendingTargets = $this->pendingTargets($employeeId, $schoolYear, [$termA, $termB]);

            $pastCycles = DB::table('academic_year')
                ->where('is_activated', 0)
                ->where('is_deleted', 0)
                ->orderByDesc('from_year')
                ->get();

            foreach ($pastCycles as $pastCycle) {
                [$ptA, $ptB] = $this->termOptions($pastCycle->term ?? null);
                $pastYear    = trim("{$pastCycle->from_year}-{$pastCycle->to_year}");
                $ratings     = $this->ratingsForCycle($employeeId, $pastYear, [$ptA, $ptB]);

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
            ],
            'cycle'          => $cycle ? [
                'school_year' => "{$cycle->from_year}-{$cycle->to_year}",
                'semester'    => $this->semesterLabel($cycle->term ?? null),
                'is_open'     => (bool) $cycle->is_activated,
            ] : null,
            'currentRatings' => $currentRatings,
            'archiveFolders' => $archiveFolders,
            'pendingTargets' => $pendingTargets,
        ]);
    }
}
