<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\EducationLevel;
use App\Models\Employee;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class TeacherPortalController extends Controller
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
            'summer' => ['Summer', 'Summer'],
            default => ['1st', '1st Sem'],
        };
    }

    private function semesterLabel(?string $term): string
    {
        $t = strtolower(trim((string) $term));

        return match (true) {
            str_contains($t, 'summer') => 'Summer',
            str_contains($t, '2nd') => '2nd Semester',
            default => '1st Semester',
        };
    }

    private function buildSubjectSectionClasses(int $employeeId, string $schoolYear, array $terms): array
    {
        if (
            ! Schema::hasTable('subject_sections') ||
            ! Schema::hasTable('sections') ||
            ! Schema::hasTable('subjects')
        ) {
            return [];
        }

        return DB::table('subject_sections as ss')
            ->join('sections as sec', 'sec.id', '=', 'ss.section_id')
            ->join('subjects as subj', 'subj.id', '=', 'ss.subject_id')
            ->leftJoin('department as d', 'd.id', '=', 'subj.department_id')
            ->select(
                DB::raw("CONCAT('section-', ss.id) as class_key"),
                'ss.id as section_id',
                'sec.name as section_name',
                'ss.school_year',
                'ss.term',
                DB::raw('NULL as schedule'),
                DB::raw('NULL as room'),
                'subj.code as course_code',
                'subj.name as course_name',
                'd.name as department_name',
                DB::raw('NULL as scope_label'),
                DB::raw('0 as enrolled_count')
            )
            ->where('ss.teacher_employee_id', $employeeId)
            ->where('ss.school_year', $schoolYear)
            ->whereIn('ss.term', $terms)
            ->where('ss.is_active', 1)
            ->whereNull('ss.deleted_at')
            ->orderBy('subj.name')
            ->orderBy('sec.name')
            ->get()
            ->map(fn ($row) => (array) $row + ['semester_label' => $this->semesterLabel($row->term)])
            ->toArray();
    }

    private function buildLegacyEducationLevelClasses(Teacher|Employee $employee, string $defaultSemesterLabel): array
    {
        if (! Schema::hasTable('education_level') || ! Schema::hasTable('subject')) {
            return [];
        }

        $levels = EducationLevel::query()
            ->with([
                'department:id,name',
                'program:id,name',
                'strand:id,name',
            ])
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderByRaw('CAST(year_level AS UNSIGNED) asc')
            ->orderBy('section')
            ->get();

        if ($levels->isEmpty()) {
            return [];
        }

        $subjectIds = $levels
            ->pluck('subject_id')
            ->flatten(1)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        /** @var Collection<int, Subject> $subjects */
        $subjects = Subject::query()
            ->whereIn('id', $subjectIds)
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->get()
            ->keyBy('id');

        $studentCounts = DB::table('student')
            ->select('education_level_id', DB::raw('COUNT(*) as total'))
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->whereIn('education_level_id', $levels->pluck('id'))
            ->groupBy('education_level_id')
            ->pluck('total', 'education_level_id');

        $classes = [];

        foreach ($levels as $level) {
            $matchesAdviser = collect($level->teacher_id ?? [])
                ->contains(fn ($id) => (int) $id === (int) $employee->id);

            $subjectTeacherMap = collect($level->subject_teacher_map ?? [])
                ->mapWithKeys(fn ($teacherId, $subjectId) => [(int) $subjectId => $teacherId ? (int) $teacherId : null]);

            $levelSubjectIds = collect($level->subject_id ?? [])
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->values();

            $matchingSubjects = $levelSubjectIds
                ->map(fn (int $subjectId) => $subjects->get($subjectId))
                ->filter()
                ->filter(function (Subject $subject) use ($employee, $subjectTeacherMap, $level) {
                    $mappedTeacherId = $subjectTeacherMap->get((int) $subject->id);

                    if ($mappedTeacherId !== null) {
                        return $mappedTeacherId === (int) $employee->id;
                    }

                    return $this->subjectFallsWithinTeacherScope($subject, $employee, $level);
                })
                ->values();

            foreach ($matchingSubjects as $subject) {
                $classes[] = [
                    'class_key' => 'legacy-subject-' . $level->id . '-' . $subject->id,
                    'section_id' => $level->id,
                    'section_name' => $this->formatLevelSection($level->year_level, $level->section, $level->program_id !== null),
                    'school_year' => null,
                    'term' => null,
                    'schedule' => null,
                    'room' => null,
                    'course_code' => $subject->code,
                    'course_name' => $subject->name,
                    'department_name' => $level->department?->name ?? $employee->department?->name ?? '',
                    'scope_label' => $this->scopeLabelForLevel($level),
                    'semester_label' => $defaultSemesterLabel,
                    'enrolled_count' => (int) ($studentCounts[$level->id] ?? 0),
                ];
            }

            if ($matchesAdviser && $matchingSubjects->isEmpty()) {
                $classes[] = [
                    'class_key' => 'legacy-adviser-' . $level->id,
                    'section_id' => $level->id,
                    'section_name' => $this->formatLevelSection($level->year_level, $level->section, $level->program_id !== null),
                    'school_year' => null,
                    'term' => null,
                    'schedule' => null,
                    'room' => null,
                    'course_code' => 'ADVISER',
                    'course_name' => 'Advisory Class',
                    'department_name' => $level->department?->name ?? $employee->department?->name ?? '',
                    'scope_label' => $this->scopeLabelForLevel($level),
                    'semester_label' => $defaultSemesterLabel,
                    'enrolled_count' => (int) ($studentCounts[$level->id] ?? 0),
                ];
            }
        }

        return $classes;
    }

    private function subjectFallsWithinTeacherScope(Subject $subject, Teacher|Employee $employee, EducationLevel $level): bool
    {
        $teacherIds = collect($subject->teacher_id ?? [])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values();

        if (! $teacherIds->contains((int) $employee->id)) {
            return false;
        }

        if (! empty($employee->program_id)) {
            return (int) ($level->program_id ?? 0) === (int) $employee->program_id
                && in_array((int) ($subject->program_id ?? 0), [0, (int) $employee->program_id], true);
        }

        if (! empty($employee->strand_id)) {
            return (int) ($level->strand_id ?? 0) === (int) $employee->strand_id
                && in_array((int) ($subject->strand_id ?? 0), [0, (int) $employee->strand_id], true);
        }

        return (int) ($level->department_id ?? 0) === (int) ($employee->department_id ?? 0)
            && (int) ($subject->department_id ?? 0) === (int) ($employee->department_id ?? 0);
    }

    private function formatLevelSection(?string $yearLevel, ?string $section, bool $isCollege): string
    {
        $prefix = $isCollege ? 'Year' : 'Grade';
        $base = trim($prefix . ' ' . ($yearLevel ?? ''));

        return $section ? $base . ' - Section ' . $section : $base;
    }

    private function scopeLabelForLevel(EducationLevel $level): ?string
    {
        if ($level->program?->name) {
            return $level->program->name;
        }

        if ($level->strand?->name) {
            return $level->strand->name;
        }

        return $level->department?->name;
    }

    private function pendingTargets(Teacher $teacher, string $schoolYear, array $terms): array
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $submitted = DB::table('evaluation_submissions')
            ->where('evaluator_id', $teacher->id)
            ->where('evaluator_type', 'teacher')
            ->where('category', 'peer_teacher')
            ->where('school_year', $schoolYear)
            ->whereIn('term', $terms)
            ->pluck('evaluatee_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $peers = Teacher::query()
            ->with(['program:id,name', 'strand:id,name', 'department:id,name'])
            ->where('id', '!=', $teacher->id)
            ->where('branch_id', $teacher->branch_id)
            ->where('department_id', $teacher->department_id)
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->when($teacher->program_id, fn ($query) => $query->where('program_id', $teacher->program_id))
            ->when(! $teacher->program_id && $teacher->strand_id, fn ($query) => $query->where('strand_id', $teacher->strand_id))
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->get();

        return $peers
            ->map(fn (Teacher $peer) => [
                'id' => $peer->id,
                'name' => $peer->full_name,
                'role' => $peer->role ?? 'Teacher',
                'scope' => $peer->program?->name ?? $peer->strand?->name ?? $peer->department?->name ?? '',
                'category' => 'peer_teacher',
                'done' => in_array($peer->id, $submitted, true),
            ])
            ->values()
            ->all();
    }

    public function evaluateForm(Request $request): Response|RedirectResponse
    {
        $teacherId = (int) session('client_id');
        $evaluateeId = (int) $request->query('evaluatee_id');
        $category = $request->query('category', 'peer_teacher');
        $cycle = $this->activeCycle();

        if (! Schema::hasTable('evaluation_submissions')) {
            return redirect()->route('portal.teacher.dashboard')
                ->with('error', 'Submissions storage is not available yet.');
        }

        if (! $cycle) {
            return redirect()->route('portal.teacher.dashboard')->with('error', 'No active evaluation cycle.');
        }

        $teacher = Teacher::query()
            ->where('id', $teacherId)
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->firstOrFail();

        $evaluatee = Teacher::query()
            ->with(['program:id,name', 'strand:id,name', 'department:id,name'])
            ->where('id', $evaluateeId)
            ->where('id', '!=', $teacherId)
            ->where('branch_id', $teacher->branch_id)
            ->where('department_id', $teacher->department_id)
            ->when($teacher->program_id, fn ($query) => $query->where('program_id', $teacher->program_id))
            ->when(! $teacher->program_id && $teacher->strand_id, fn ($query) => $query->where('strand_id', $teacher->strand_id))
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->first();

        if (! $evaluatee) {
            return redirect()->route('portal.teacher.dashboard')->with('error', 'Co-teacher not found in your assigned scope.');
        }

        $questions = DB::table('question')
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->whereIn('question_type_id', DB::table('question_type')->where('code', 'like', '%peer%')->pluck('id'))
            ->select('id as question_id', 'description as question_text')
            ->orderBy('id')
            ->get();

        return Inertia::render('Teacher/EvaluateForm', [
            'category' => $category,
            'evaluatee' => [
                'id' => $evaluatee->id,
                'name' => $evaluatee->full_name,
                'role' => $evaluatee->role ?? 'Teacher',
                'scope' => $evaluatee->program?->name ?? $evaluatee->strand?->name ?? $evaluatee->department?->name ?? '',
            ],
            'questions' => $questions,
            'cycle' => [
                'id' => $cycle->id,
                'school_year' => "{$cycle->from_year}-{$cycle->to_year}",
                'semester' => $this->semesterLabel($cycle->term ?? null),
                'term' => $cycle->term,
            ],
        ]);
    }

    public function submitEvaluation(Request $request): RedirectResponse
    {
        $teacherId = (int) session('client_id');

        $data = $request->validate([
            'category' => 'required|in:peer_teacher',
            'evaluatee_id' => 'required|integer|exists:teacher,id',
            'academic_year_id' => 'required|integer',
            'school_year' => 'required|string|max:20',
            'term' => 'required|string|max:50',
            'answers' => 'required|array|min:1',
            'answers.*.question_id' => 'required|integer',
            'answers.*.rating' => 'required|integer|between:1,5',
            'comments' => 'nullable|string|max:2000',
        ]);

        if (! Schema::hasTable('evaluation_submissions')) {
            return back()->withErrors(['message' => 'Submissions storage is not available.']);
        }

        $teacher = Teacher::query()
            ->where('id', $teacherId)
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->firstOrFail();

        $evaluatee = Teacher::query()
            ->where('id', $data['evaluatee_id'])
            ->where('id', '!=', $teacherId)
            ->where('branch_id', $teacher->branch_id)
            ->where('department_id', $teacher->department_id)
            ->when($teacher->program_id, fn ($query) => $query->where('program_id', $teacher->program_id))
            ->when(! $teacher->program_id && $teacher->strand_id, fn ($query) => $query->where('strand_id', $teacher->strand_id))
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->first();

        if (! $evaluatee) {
            return redirect()->route('portal.teacher.dashboard')->with('error', 'Co-teacher not found in your assigned scope.');
        }

        $terms = array_values(array_unique(array_filter([
            $data['term'],
            ...$this->termOptions($data['term']),
        ])));

        $already = DB::table('evaluation_submissions')
            ->where('evaluator_id', $teacherId)
            ->where('evaluator_type', 'teacher')
            ->where('evaluatee_id', $evaluatee->id)
            ->where('school_year', $data['school_year'])
            ->whereIn('term', $terms)
            ->where('category', $data['category'])
            ->exists();

        if ($already) {
            return redirect()->route('portal.teacher.dashboard')->with('error', 'You have already submitted this faculty evaluation.');
        }

        $ratings = array_column($data['answers'], 'rating');
        $avg = count($ratings) ? round(array_sum($ratings) / count($ratings), 2) : 0;

        DB::table('evaluation_submissions')->insert([
            'evaluator_id' => $teacherId,
            'evaluator_type' => 'teacher',
            'evaluatee_id' => $evaluatee->id,
            'evaluatee_type' => 'teacher',
            'category' => $data['category'],
            'subject_section_id' => null,
            'academic_year_id' => $data['academic_year_id'],
            'school_year' => $data['school_year'],
            'term' => $terms[0] ?? $data['term'],
            'answers' => json_encode($data['answers']),
            'comments' => $data['comments'] ?? null,
            'overall_average' => $avg,
            'submitted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $existing = DB::table('ratings_peer')
            ->where('academic_year_id', $data['academic_year_id'])
            ->where('teacher_id', $evaluatee->id)
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

            DB::table('ratings_peer')->where('id', $existing->id)->update([
                'submission_count' => $count,
                'item_ratings' => json_encode($combined),
                'overall_ratings' => json_encode(['average' => $overall]),
                'updated_at' => now(),
            ]);
        } else {
            $overall = count($newItems) ? round(array_sum($newItems) / count($newItems), 2) : 0;

            DB::table('ratings_peer')->insert([
                'academic_year_id' => $data['academic_year_id'],
                'teacher_id' => $evaluatee->id,
                'submission_count' => 1,
                'item_ratings' => json_encode($newItems),
                'overall_ratings' => json_encode(['average' => $overall]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return redirect()->route('portal.teacher.dashboard')->with('success', 'Faculty evaluation submitted. Thank you!');
    }

    public function dashboard(): Response
    {
        $employeeId = (int) session('client_id');
        $teacher = Teacher::with(['branch', 'department', 'program', 'strand'])->findOrFail($employeeId);

        $cycle = $this->activeCycle();
        $classes = [];
        $pendingTargets = [];

        if ($cycle) {
            [$termA, $termB] = $this->termOptions($cycle->term ?? null);
            $schoolYear = trim("{$cycle->from_year}-{$cycle->to_year}");
            $semesterLabel = $this->semesterLabel($cycle->term ?? null);

            $classes = array_merge(
                $this->buildSubjectSectionClasses($employeeId, $schoolYear, [$termA, $termB]),
                $this->buildLegacyEducationLevelClasses($teacher, $semesterLabel),
            );

            $pendingTargets = $this->pendingTargets($teacher, $schoolYear, [$termA, $termB]);
        }

        usort($classes, fn (array $a, array $b) => [$a['course_name'], $a['section_name']] <=> [$b['course_name'], $b['section_name']]);

        return Inertia::render('Teacher/Dashboard', [
            'teacher' => [
                'id' => $teacher->id,
                'name' => $teacher->full_name,
                'employee_no' => $teacher->employee_no,
                'branch' => $teacher->branch?->name ?? '',
                'department' => $teacher->department?->name ?? '',
                'program' => $teacher->program?->name ?? '',
                'strand' => $teacher->strand?->name ?? '',
                'email' => $teacher->email ?? '',
                'role' => $teacher->role ?? 'faculty',
            ],
            'cycle' => $cycle ? [
                'school_year' => "{$cycle->from_year}-{$cycle->to_year}",
                'semester' => $this->semesterLabel($cycle->term ?? null),
                'is_open' => (bool) $cycle->is_activated,
            ] : null,
            'classes' => $classes,
            'pendingTargets' => $pendingTargets,
        ]);
    }
}
