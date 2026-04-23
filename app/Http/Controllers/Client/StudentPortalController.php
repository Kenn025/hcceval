<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StudentPortalController extends Controller
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
        $studentId = (int) session('client_id');
        $student   = Student::with(['branch', 'department', 'program', 'strand', 'yearLevel'])
            ->findOrFail($studentId);

        $cycle = $this->activeCycle();
        $subjects     = [];
        $evaluations  = [];
        $archive      = [];

        if ($cycle) {
            [$termA, $termB] = $this->termOptions($cycle->term ?? null);
            $schoolYear      = trim("{$cycle->from_year}-{$cycle->to_year}");

            // My subjects for current cycle (read-only — no evaluate button)
            $subjects = DB::table('student_enrollments as se')
                ->join('subject_sections as ss', 'ss.id', '=', 'se.subject_section_id')
                ->join('sections as sec', 'sec.id', '=', 'ss.section_id')
                ->join('subjects as subj', 'subj.id', '=', 'ss.subject_id')
                ->leftJoin('employees as e', 'e.id', '=', 'ss.teacher_employee_id')
                ->leftJoin('evaluation_submissions as es', function ($join) use ($studentId, $schoolYear, $termA, $termB) {
                    $join->on('es.student_id', '=', DB::raw($studentId))
                         ->on('es.subject_section_id', '=', 'ss.id')
                         ->whereIn('es.term', [$termA, $termB])
                         ->where('es.school_year', $schoolYear)
                         ->where('es.status', 'submitted');
                })
                ->select(
                    'ss.id as section_id',
                    'sec.name as section_name',
                    'ss.school_year',
                    'ss.term',
                    'ss.schedule',
                    'ss.room',
                    'subj.id as course_id',
                    'subj.code as course_code',
                    'subj.name as course_name',
                    DB::raw("TRIM(CONCAT(e.first_name, ' ', COALESCE(e.middle_name, ''), ' ', e.last_name)) as teacher_name"),
                    DB::raw("COALESCE(e.role, 'teacher') as teacher_role"),
                    DB::raw('CASE WHEN es.id IS NOT NULL THEN 1 ELSE 0 END as already_evaluated')
                )
                ->where('se.student_id', $studentId)
                ->where('se.status', 'enrolled')
                ->where('ss.is_active', 1)
                ->whereNull('ss.deleted_at')
                ->where('ss.school_year', $schoolYear)
                ->whereIn('ss.term', [$termA, $termB])
                ->orderBy('subj.name')
                ->get()
                ->map(fn ($row) => (array) $row + ['semester_label' => $this->semesterLabel($row->term)])
                ->toArray();

            // My evaluations for current cycle
            $evaluations = DB::table('evaluation_submissions as es')
                ->join('subject_sections as ss', 'ss.id', '=', 'es.subject_section_id')
                ->join('sections as sec', 'sec.id', '=', 'ss.section_id')
                ->join('subjects as subj', 'subj.id', '=', 'ss.subject_id')
                ->leftJoin('employees as e', 'e.id', '=', 'ss.teacher_employee_id')
                ->select(
                    'es.id as submission_id',
                    'es.subject_section_id as section_id',
                    'es.school_year',
                    'es.term',
                    'es.submitted_at',
                    'sec.name as section_name',
                    'subj.code as course_code',
                    'subj.name as course_name',
                    DB::raw("TRIM(CONCAT(e.first_name, ' ', COALESCE(e.middle_name, ''), ' ', e.last_name)) as teacher_name")
                )
                ->where('es.student_id', $studentId)
                ->where('es.status', 'submitted')
                ->where('es.school_year', $schoolYear)
                ->whereIn('es.term', [$termA, $termB])
                ->orderByDesc('es.submitted_at')
                ->get()
                ->map(fn ($row) => (array) $row + ['semester_label' => $this->semesterLabel($row->term)])
                ->toArray();

            // Archive — past academic years
            $archive = DB::table('evaluation_submissions as es')
                ->join('subject_sections as ss', 'ss.id', '=', 'es.subject_section_id')
                ->join('sections as sec', 'sec.id', '=', 'ss.section_id')
                ->join('subjects as subj', 'subj.id', '=', 'ss.subject_id')
                ->leftJoin('employees as e', 'e.id', '=', 'ss.teacher_employee_id')
                ->select(
                    'es.id as submission_id',
                    'es.school_year',
                    'es.term',
                    'es.submitted_at',
                    'subj.code as course_code',
                    'subj.name as course_name',
                    DB::raw("TRIM(CONCAT(e.first_name, ' ', COALESCE(e.middle_name, ''), ' ', e.last_name)) as teacher_name")
                )
                ->where('es.student_id', $studentId)
                ->where('es.status', 'submitted')
                ->where(fn ($q) => $q->where('es.school_year', '!=', $schoolYear)
                    ->orWhereNotIn('es.term', [$termA, $termB]))
                ->orderByDesc('es.submitted_at')
                ->get()
                ->map(fn ($row) => (array) $row + ['semester_label' => $this->semesterLabel($row->term)])
                ->toArray();
        }

        return Inertia::render('Student/Dashboard', [
            'student'     => [
                'id'          => $student->id,
                'name'        => $student->full_name,
                'student_no'  => $student->student_no,
                'branch'      => $student->branch?->name ?? '',
                'department'  => $student->department?->name ?? '',
                'program'     => $student->program?->name ?? $student->yearLevel?->name ?? '',
                'email'       => $student->email ?? '',
            ],
            'cycle'       => $cycle ? [
                'school_year' => "{$cycle->from_year}-{$cycle->to_year}",
                'semester'    => $this->semesterLabel($cycle->term ?? null),
                'is_open'     => (bool) $cycle->is_open,
            ] : null,
            'subjects'    => $subjects,
            'evaluations' => $evaluations,
            'archive'     => $archive,
        ]);
    }
}
