<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TeacherPortalController extends Controller
{
    private function activeCycle(): ?object
    {
        return DB::table('academic_year')
            ->where('is_open', 1)
            ->orderByDesc('from_year')
            ->first();
    }

    private function termOptions(?string $term): array
    {
        return match (strtolower(trim((string) $term))) {
            '2nd', '2nd sem' => ['2nd', '2nd Sem'],
            'summer'         => ['Summer', 'Summer'],
            default          => ['1st', '1st Sem'],
        };
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

    public function dashboard(): Response
    {
        $employeeId = (int) session('client_id');
        $employee   = Employee::with(['branch', 'department', 'program'])
            ->findOrFail($employeeId);

        $cycle   = $this->activeCycle();
        $classes = [];

        if ($cycle) {
            [$termA, $termB] = $this->termOptions($cycle->term ?? null);
            $schoolYear      = trim("{$cycle->from_year}-{$cycle->to_year}");

            $classes = DB::table('subject_sections as ss')
                ->join('sections as sec', 'sec.id', '=', 'ss.section_id')
                ->join('subjects as subj', 'subj.id', '=', 'ss.subject_id')
                ->leftJoin('departments as d', 'd.id', '=', 'subj.department_id')
                ->select(
                    'ss.id as section_id',
                    'sec.name as section_name',
                    'ss.school_year',
                    'ss.term',
                    'ss.schedule',
                    'ss.room',
                    'subj.code as course_code',
                    'subj.name as course_name',
                    'd.name as department_name',
                    DB::raw('(SELECT COUNT(*) FROM student_enrollments WHERE subject_section_id = ss.id AND status = \'enrolled\') as enrolled_count')
                )
                ->where('ss.teacher_employee_id', $employeeId)
                ->where('ss.school_year', $schoolYear)
                ->whereIn('ss.term', [$termA, $termB])
                ->where('ss.is_active', 1)
                ->whereNull('ss.deleted_at')
                ->orderBy('subj.name')
                ->orderBy('sec.name')
                ->get()
                ->map(fn ($row) => (array) $row + ['semester_label' => $this->semesterLabel($row->term)])
                ->toArray();
        }

        return Inertia::render('Teacher/Dashboard', [
            'teacher' => [
                'id'          => $employee->id,
                'name'        => $employee->full_name,
                'employee_no' => $employee->employee_no,
                'branch'      => $employee->branch?->name ?? '',
                'department'  => $employee->department?->name ?? '',
                'program'     => $employee->program?->name ?? '',
                'email'       => $employee->email ?? '',
                'role'        => $employee->role ?? 'faculty',
            ],
            'cycle'   => $cycle ? [
                'school_year' => "{$cycle->from_year}-{$cycle->to_year}",
                'semester'    => $this->semesterLabel($cycle->term ?? null),
                'is_open'     => (bool) $cycle->is_open,
            ] : null,
            'classes' => $classes,
        ]);
    }
}
