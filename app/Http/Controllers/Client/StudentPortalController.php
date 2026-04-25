<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class StudentPortalController extends Controller
{
    private function activeCycle(): ?object
    {
        return DB::table('academic_year')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
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

    public function evaluateForm(Request $request): Response|RedirectResponse
    {
        $studentId = (int) session('client_id');
        $subjectSectionId = (int) $request->query('subject_section_id');
        $category = $request->query('category', 'teacher_subject');
        $cycle = $this->activeCycle();

        if (
            ! Schema::hasTable('evaluation_submissions')
            || ! Schema::hasTable('student_enrollments')
            || ! Schema::hasTable('subject_sections')
        ) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'Submissions storage is not available yet.');
        }

        if (! $cycle) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'No active evaluation cycle.');
        }

        [$termA, $termB] = $this->termOptions($cycle->term ?? null);
        $schoolYear = "{$cycle->from_year}-{$cycle->to_year}";

        $subjectSection = DB::table('student_enrollments as se')
            ->join('subject_sections as ss', 'ss.id', '=', 'se.subject_section_id')
            ->join('subject as subj', 'subj.id', '=', 'ss.subject_id')
            ->leftJoin('employee as e', 'e.id', '=', 'ss.teacher_employee_id')
            ->select(
                'ss.id',
                'ss.subject_id',
                'ss.teacher_employee_id',
                'ss.school_year',
                'ss.term',
                'subj.code as subject_code',
                'subj.name as subject_name',
                DB::raw("TRIM(CONCAT(e.firstname, ' ', COALESCE(e.middlename, ''), ' ', e.lastname)) as teacher_name"),
                DB::raw("COALESCE(e.role, 'Teacher') as teacher_role")
            )
            ->where('se.student_id', $studentId)
            ->where('se.status', 'enrolled')
            ->where('ss.id', $subjectSectionId)
            ->where('ss.school_year', $schoolYear)
            ->whereIn('ss.term', [$termA, $termB])
            ->where('ss.is_active', 1)
            ->whereNull('ss.deleted_at')
            ->first();

        if (! $subjectSection) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'Subject section not found for this student.');
        }

        if (! $subjectSection->teacher_employee_id) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'No teacher is assigned to this subject section.');
        }

        $questions = DB::table('question')
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->whereIn('question_type_id', DB::table('question_type')->where('code', 'like', '%subject%')->pluck('id'))
            ->select('id as question_id', 'description as question_text')
            ->orderBy('id')
            ->get();

        return Inertia::render('Student/EvaluateForm', [
            'category' => $category,
            'evaluatee' => [
                'id' => $subjectSection->teacher_employee_id,
                'name' => trim((string) $subjectSection->teacher_name),
                'role' => $subjectSection->teacher_role ?? 'Teacher',
            ],
            'subjectSectionId' => $subjectSection->id,
            'subjectInfo' => [
                'code' => $subjectSection->subject_code,
                'name' => $subjectSection->subject_name,
            ],
            'questions' => $questions,
            'cycle' => [
                'id' => $cycle->id,
                'school_year' => $schoolYear,
                'semester' => $this->semesterLabel($cycle->term ?? null),
                'term' => $subjectSection->term,
            ],
        ]);
    }

    public function submitEvaluation(Request $request): RedirectResponse
    {
        $studentId = (int) session('client_id');

        $data = $request->validate([
            'category' => 'required|in:teacher_subject',
            'evaluatee_id' => 'nullable|integer',
            'subject_section_id' => 'required|integer',
            'academic_year_id' => 'required|integer',
            'school_year' => 'required|string|max:20',
            'term' => 'required|string|max:50',
            'answers' => 'required|array|min:1',
            'answers.*.question_id' => 'required|integer',
            'answers.*.rating' => 'required|integer|between:1,5',
            'comments' => 'nullable|string|max:2000',
        ]);

        if (
            ! Schema::hasTable('evaluation_submissions')
            || ! Schema::hasTable('student_enrollments')
            || ! Schema::hasTable('subject_sections')
        ) {
            return back()->withErrors(['message' => 'Submissions storage is not available.']);
        }

        $terms = array_values(array_unique(array_filter([
            $data['term'],
            ...$this->termOptions($data['term']),
        ])));

        $subjectSection = DB::table('student_enrollments as se')
            ->join('subject_sections as ss', 'ss.id', '=', 'se.subject_section_id')
            ->select('ss.id', 'ss.subject_id', 'ss.teacher_employee_id', 'ss.school_year', 'ss.term')
            ->where('se.student_id', $studentId)
            ->where('se.status', 'enrolled')
            ->where('ss.id', $data['subject_section_id'])
            ->where('ss.school_year', $data['school_year'])
            ->whereIn('ss.term', $terms)
            ->where('ss.is_active', 1)
            ->whereNull('ss.deleted_at')
            ->first();

        if (! $subjectSection) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'Subject section not found for this student.');
        }

        if (! $subjectSection->teacher_employee_id) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'No teacher is assigned to this subject section.');
        }

        $already = DB::table('evaluation_submissions')
            ->where('evaluator_id', $studentId)
            ->where('evaluator_type', 'student')
            ->where('subject_section_id', $subjectSection->id)
            ->where('school_year', $subjectSection->school_year)
            ->where('term', $subjectSection->term)
            ->where('category', $data['category'])
            ->exists();

        if ($already) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'You have already submitted this evaluation.');
        }

        $ratings = array_column($data['answers'], 'rating');
        $avg = count($ratings) ? round(array_sum($ratings) / count($ratings), 2) : 0;

        DB::table('evaluation_submissions')->insert([
            'evaluator_id' => $studentId,
            'evaluator_type' => 'student',
            'evaluatee_id' => $subjectSection->teacher_employee_id,
            'evaluatee_type' => 'employee',
            'category' => $data['category'],
            'subject_section_id' => $subjectSection->id,
            'academic_year_id' => $data['academic_year_id'],
            'school_year' => $subjectSection->school_year,
            'term' => $subjectSection->term,
            'answers' => json_encode($data['answers']),
            'comments' => $data['comments'] ?? null,
            'overall_average' => $avg,
            'submitted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $existing = DB::table('ratings_subject')
            ->where('academic_year_id', $data['academic_year_id'])
            ->where('subject_id', $subjectSection->subject_id)
            ->where('employee_id', $subjectSection->teacher_employee_id)
            ->first();

        $newItems = collect($data['answers'])
            ->groupBy('question_id')
            ->map(fn ($group) => round($group->avg('rating'), 2))
            ->toArray();

        if ($existing) {
            $count = ((int) $existing->submission_count) + 1;
            $previous = json_decode($existing->item_ratings ?? '{}', true) ?: [];
            $combined = [];

            foreach (array_unique(array_merge(array_keys($previous), array_keys($newItems))) as $questionId) {
                $combined[$questionId] = round((($previous[$questionId] ?? 0) * ($count - 1) + ($newItems[$questionId] ?? 0)) / $count, 2);
            }

            $overall = count($combined) ? round(array_sum($combined) / count($combined), 2) : 0;

            DB::table('ratings_subject')->where('id', $existing->id)->update([
                'submission_count' => $count,
                'item_ratings' => json_encode($combined),
                'overall_ratings' => json_encode(['average' => $overall]),
                'updated_at' => now(),
            ]);
        } else {
            $overall = count($newItems) ? round(array_sum($newItems) / count($newItems), 2) : 0;

            DB::table('ratings_subject')->insert([
                'academic_year_id' => $data['academic_year_id'],
                'subject_id' => $subjectSection->subject_id,
                'employee_id' => $subjectSection->teacher_employee_id,
                'submission_count' => 1,
                'item_ratings' => json_encode($newItems),
                'overall_ratings' => json_encode(['average' => $overall]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return redirect()->route('portal.student.dashboard')->with('success', 'Evaluation submitted. Thank you!');
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

        if (
            $cycle &&
            Schema::hasTable('student_enrollments') &&
            Schema::hasTable('subject_sections') &&
            Schema::hasTable('sections') &&
            Schema::hasTable('subjects') &&
            Schema::hasTable('evaluation_submissions')
        ) {
            [$termA, $termB] = $this->termOptions($cycle->term ?? null);
            $schoolYear      = trim("{$cycle->from_year}-{$cycle->to_year}");

            // My subjects for current cycle (read-only — no evaluate button)
            $subjects = DB::table('student_enrollments as se')
                ->join('subject_sections as ss', 'ss.id', '=', 'se.subject_section_id')
                ->join('sections as sec', 'sec.id', '=', 'ss.section_id')
                ->join('subjects as subj', 'subj.id', '=', 'ss.subject_id')
                ->leftJoin('employee as e', 'e.id', '=', 'ss.teacher_employee_id')
                ->leftJoin('evaluation_submissions as es', function ($join) use ($studentId, $schoolYear, $termA, $termB) {
                    $join->on('es.evaluator_id', '=', DB::raw($studentId))
                         ->on('es.subject_section_id', '=', 'ss.id')
                         ->where('es.evaluator_type', 'student')
                         ->where('es.category', 'teacher_subject')
                         ->whereIn('es.term', [$termA, $termB])
                         ->where('es.school_year', $schoolYear);
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
                    DB::raw("TRIM(CONCAT(e.firstname, ' ', COALESCE(e.middlename, ''), ' ', e.lastname)) as teacher_name"),
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
                ->leftJoin('employee as e', 'e.id', '=', 'ss.teacher_employee_id')
                ->select(
                    'es.id as submission_id',
                    'es.subject_section_id as section_id',
                    'es.school_year',
                    'es.term',
                    'es.submitted_at',
                    'sec.name as section_name',
                    'subj.code as course_code',
                    'subj.name as course_name',
                    DB::raw("TRIM(CONCAT(e.firstname, ' ', COALESCE(e.middlename, ''), ' ', e.lastname)) as teacher_name")
                )
                ->where('es.evaluator_id', $studentId)
                ->where('es.evaluator_type', 'student')
                ->where('es.category', 'teacher_subject')
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
                ->leftJoin('employee as e', 'e.id', '=', 'ss.teacher_employee_id')
                ->select(
                    'es.id as submission_id',
                    'es.school_year',
                    'es.term',
                    'es.submitted_at',
                    'subj.code as course_code',
                    'subj.name as course_name',
                    DB::raw("TRIM(CONCAT(e.firstname, ' ', COALESCE(e.middlename, ''), ' ', e.lastname)) as teacher_name")
                )
                ->where('es.evaluator_id', $studentId)
                ->where('es.evaluator_type', 'student')
                ->where('es.category', 'teacher_subject')
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
                'is_open'     => (bool) $cycle->is_activated,
            ] : null,
            'subjects'    => $subjects,
            'evaluations' => $evaluations,
            'archive'     => $archive,
        ]);
    }
}
