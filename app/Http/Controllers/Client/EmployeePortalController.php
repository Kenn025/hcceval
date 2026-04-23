<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;
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

    public function dashboard(): Response
    {
        $employeeId = (int) session('client_id');
        $employee   = Employee::with(['branch', 'department'])
            ->findOrFail($employeeId);

        $cycle          = $this->activeCycle();
        $currentRatings = [];
        $archiveFolders = [];

        if ($cycle) {
            [$termA, $termB] = $this->termOptions($cycle->term ?? null);
            $schoolYear      = trim("{$cycle->from_year}-{$cycle->to_year}");

            $currentRatings = $this->ratingsForCycle($employeeId, $schoolYear, [$termA, $termB]);

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
        ]);
    }
}
