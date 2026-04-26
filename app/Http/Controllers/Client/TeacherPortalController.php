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

    private function questionnaireQuestions(?int $questionnaireId)
    {
        if (
            ! $questionnaireId
            || ! Schema::hasTable('questionnaires')
            || ! Schema::hasTable('question')
        ) {
            return collect();
        }

        $questionnaire = DB::table('questionnaires')
            ->select('id', 'title', 'items')
            ->where('id', $questionnaireId)
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->first();

        if (! $questionnaire) {
            return collect();
        }

        $items = json_decode($questionnaire->items ?? '{}', true) ?: [];
        $questionIds = collect($items['scale_questions'] ?? [])
            ->flatMap(fn ($group) => collect($group['questions'] ?? [])->map(fn ($id) => (int) $id))
            ->filter()
            ->unique()
            ->values();

        if ($questionIds->isEmpty() && is_array($items)) {
            $questionIds = collect($items)
                ->filter(fn ($id) => is_scalar($id) && (is_int($id) || ctype_digit((string) $id)))
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();
        }

        if ($questionIds->isEmpty()) {
            return collect();
        }

        $questions = DB::table('question')
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->whereIn('id', $questionIds->all())
            ->select('id as question_id', 'description as question_text')
            ->get()
            ->keyBy('question_id');

        return $questionIds
            ->map(fn ($questionId) => $questions->get($questionId))
            ->filter()
            ->values();
    }

    private function questionnaireTypeId(?int $questionnaireId): ?int
    {
        if (! $questionnaireId || ! Schema::hasTable('questionnaires')) {
            return null;
        }

        $typeId = DB::table('questionnaires')
            ->where('id', $questionnaireId)
            ->value('questionnaire_type_id');

        return $typeId ? (int) $typeId : null;
    }

    private function teacherSubmissionIds(Teacher $teacher): array
    {
        return collect(data_get($teacher->personal_info ?? [], 'evaluation_submission_ids', []))
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function rememberTeacherSubmissionId(Teacher $teacher, int $submissionId): void
    {
        $personalInfo = $teacher->personal_info ?? [];
        $personalInfo['evaluation_submission_ids'] = collect(data_get($personalInfo, 'evaluation_submission_ids', []))
            ->map(fn ($id) => (int) $id)
            ->push($submissionId)
            ->filter()
            ->unique()
            ->values()
            ->all();

        $teacher->forceFill([
            'personal_info' => $personalInfo,
        ])->save();
    }

    private function evaluationTargets(
        Teacher $teacher,
        string $schoolYear,
        array $terms,
        ?int $academicYearId = null,
        string $category = 'peer_teacher'
    ): array
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $hasLegacyEvaluatorColumns = Schema::hasColumn('evaluation_submissions', 'evaluator_id')
            && Schema::hasColumn('evaluation_submissions', 'evaluatee_id');

        if ($hasLegacyEvaluatorColumns) {
            $submitted = DB::table('evaluation_submissions')
                ->where('evaluator_id', $teacher->id)
                ->where('evaluator_type', 'teacher')
                ->where('category', $category)
                ->where('school_year', $schoolYear)
                ->whereIn('term', $terms)
                ->pluck('evaluatee_id')
                ->map(fn ($id) => (int) $id)
                ->all();
        } else {
            $submissionIds = $this->teacherSubmissionIds($teacher);

            $submitted = empty($submissionIds)
                ? []
                : DB::table('evaluation_submissions')
                    ->whereIn('id', $submissionIds)
                    ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId))
                    ->pluck('teacher_id')
                    ->map(fn ($id) => (int) $id)
                    ->all();
        }

        $targets = Teacher::query()
            ->with(['program:id,name', 'strand:id,name', 'department:id,name'])
            ->where('id', '!=', $teacher->id)
            ->where('branch_id', $teacher->branch_id)
            ->where('department_id', $teacher->department_id)
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->when(
                $category === 'head_teacher',
                fn ($query) => $query->whereRaw('LOWER(COALESCE(role, "")) LIKE ?', ['%program chair%']),
                fn ($query) => $query
                    ->whereRaw('LOWER(COALESCE(role, "")) NOT LIKE ?', ['%program chair%'])
                    ->when($teacher->program_id, fn ($q) => $q->where('program_id', $teacher->program_id))
                    ->when(! $teacher->program_id && $teacher->strand_id, fn ($q) => $q->where('strand_id', $teacher->strand_id))
            )
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->get();

        $questionnaires = DB::table('questionnaires')
            ->select('id', 'code', 'title')
            ->whereIn('id', $targets->pluck('questionnaire_id')->filter()->unique()->values())
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->get()
            ->keyBy('id');

        return $targets
            ->map(fn (Teacher $target) => [
                'id' => $target->id,
                'name' => $target->full_name,
                'role' => $target->role ?? 'Teacher',
                'scope' => $target->program?->name ?? $target->strand?->name ?? $target->department?->name ?? '',
                'scoped' => $category === 'head_teacher'
                    ? (
                        (! empty($teacher->program_id) && (int) $target->program_id === (int) $teacher->program_id)
                        || (! empty($teacher->strand_id) && empty($teacher->program_id) && (int) $target->strand_id === (int) $teacher->strand_id)
                    )
                    : true,
                'questionnaire_id' => $target->questionnaire_id ? (int) $target->questionnaire_id : null,
                'questionnaire_code' => $target->questionnaire_id
                    ? data_get($questionnaires->get((int) $target->questionnaire_id), 'code')
                    : null,
                'questionnaire_title' => $target->questionnaire_id
                    ? data_get($questionnaires->get((int) $target->questionnaire_id), 'title')
                    : null,
                'category' => $category,
                'done' => in_array($target->id, $submitted, true),
            ])
            ->values()
            ->all();
    }

    private function submittedFormsByTarget(Teacher $teacher, array $targets, ?object $cycle): array
    {
        if (! $cycle || ! Schema::hasTable('evaluation_submissions') || empty($targets)) {
            return [];
        }

        $targetIds = collect($targets)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->values();

        if ($targetIds->isEmpty()) {
            return [];
        }

        $hasLegacyEvaluatorColumns = Schema::hasColumn('evaluation_submissions', 'evaluator_id')
            && Schema::hasColumn('evaluation_submissions', 'evaluatee_id');

        if ($hasLegacyEvaluatorColumns) {
            $terms = array_values(array_unique(array_filter([
                $cycle->term,
                ...$this->termOptions($cycle->term ?? null),
            ])));

            $rows = DB::table('evaluation_submissions')
                ->select('id', 'evaluatee_id', 'answers', 'comments', 'submitted_at', 'updated_at')
                ->where('evaluator_id', $teacher->id)
                ->where('evaluator_type', 'teacher')
                ->where('category', 'peer_teacher')
                ->where('school_year', "{$cycle->from_year}-{$cycle->to_year}")
                ->whereIn('term', $terms)
                ->whereIn('evaluatee_id', $targetIds->all())
                ->orderByDesc('submitted_at')
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->get();
        } else {
            $submissionIds = $this->teacherSubmissionIds($teacher);

            if (empty($submissionIds)) {
                return [];
            }

            $rows = DB::table('evaluation_submissions')
                ->select('id', 'teacher_id', 'answers', 'comments', 'created_at', 'updated_at')
                ->whereIn('id', $submissionIds)
                ->where('academic_year_id', (int) $cycle->id)
                ->whereIn('teacher_id', $targetIds->all())
                ->orderByDesc('updated_at')
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->get();
        }

        return $rows
            ->groupBy(fn ($row) => (int) ($hasLegacyEvaluatorColumns ? $row->evaluatee_id : $row->teacher_id))
            ->map(function ($group) use ($hasLegacyEvaluatorColumns) {
                $row = $group->first();
                $answers = json_decode($row->answers ?? '[]', true);

                $submittedAnswers = collect(is_array($answers) ? $answers : [])
                    ->filter(fn ($answer) => is_array($answer))
                    ->mapWithKeys(function ($answer) {
                        $questionId = (int) ($answer['question_id'] ?? 0);
                        $rating = isset($answer['rating']) ? (int) $answer['rating'] : null;

                        return $questionId > 0 && $rating !== null
                            ? [$questionId => $rating]
                            : [];
                    })
                    ->all();

                $submittedComment = null;

                if ($hasLegacyEvaluatorColumns) {
                    $submittedComment = is_string($row->comments) && trim($row->comments) !== ''
                        ? trim($row->comments)
                        : null;
                } else {
                    $decodedComments = json_decode($row->comments ?? '[]', true);

                    if (is_array($decodedComments)) {
                        $submittedComment = trim((string) ($decodedComments['text'] ?? '')) ?: null;
                    } elseif (is_string($row->comments) && trim($row->comments) !== '') {
                        $submittedComment = trim($row->comments);
                    }
                }

                return [
                    'submission_id' => (int) $row->id,
                    'submitted_answers' => $submittedAnswers,
                    'submitted_comment' => $submittedComment,
                    'submitted_at' => $hasLegacyEvaluatorColumns
                        ? ($row->submitted_at ?? $row->updated_at)
                        : ($row->updated_at ?? $row->created_at),
                ];
            })
            ->all();
    }

    private function evaluationFormsForTargets(array $targets, ?object $cycle, array $submittedForms = []): array
    {
        if (! $cycle) {
            return [];
        }

        $forms = [];
        $schoolYear = "{$cycle->from_year}-{$cycle->to_year}";
        $semester = $this->semesterLabel($cycle->term ?? null);

        foreach ($targets as $target) {
            $questionnaireId = (int) ($target['questionnaire_id'] ?? 0);
            $questions = $this->questionnaireQuestions($questionnaireId);

            if ($questions->isEmpty()) {
                continue;
            }

            $forms[(string) $target['id']] = [
                'category' => $target['category'] ?? 'peer_teacher',
                'questionnaireId' => $questionnaireId ?: null,
                'questionnaireTitle' => $target['questionnaire_title'] ?? null,
                'submission' => $submittedForms[(int) $target['id']] ?? null,
                'evaluatee' => [
                    'id' => $target['id'],
                    'name' => $target['name'],
                    'role' => $target['role'] ?? 'Teacher',
                    'scope' => $target['scope'] ?? '',
                ],
                'questions' => $questions->values()->all(),
                'cycle' => [
                    'id' => $cycle->id,
                    'school_year' => $schoolYear,
                    'semester' => $semester,
                    'term' => $cycle->term,
                ],
            ];
        }

        return $forms;
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

        $evaluateeQuery = Teacher::query()
            ->with(['program:id,name', 'strand:id,name', 'department:id,name'])
            ->where('id', $evaluateeId)
            ->where('id', '!=', $teacherId)
            ->where('branch_id', $teacher->branch_id)
            ->where('department_id', $teacher->department_id)
            ->where('is_deleted', 0)
            ->where('is_activated', 1);

        if ($category === 'head_teacher') {
            $evaluateeQuery->whereRaw('LOWER(COALESCE(role, "")) LIKE ?', ['%program chair%']);
        } else {
            $evaluateeQuery
                ->whereRaw('LOWER(COALESCE(role, "")) NOT LIKE ?', ['%program chair%'])
                ->when($teacher->program_id, fn ($query) => $query->where('program_id', $teacher->program_id))
                ->when(! $teacher->program_id && $teacher->strand_id, fn ($query) => $query->where('strand_id', $teacher->strand_id));
        }

        $evaluatee = $evaluateeQuery->first();

        if (! $evaluatee) {
            return redirect()->route('portal.teacher.dashboard')->with('error', $category === 'head_teacher'
                ? 'School head not found in your assigned scope.'
                : 'Co-teacher not found in your assigned scope.');
        }

        $questionnaireId = $evaluatee->questionnaire_id ? (int) $evaluatee->questionnaire_id : null;
        $questions = $this->questionnaireQuestions($questionnaireId);

        if ($questions->isEmpty()) {
            return redirect()->route('portal.teacher.dashboard')
                ->with('error', 'No questionnaire is assigned to this faculty member yet.');
        }

        $questionnaireTitle = DB::table('questionnaires')
            ->where('id', $questionnaireId)
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->value('title');

        return Inertia::render('Teacher/EvaluateForm', [
            'category' => $category,
            'questionnaireId' => $questionnaireId,
            'questionnaireTitle' => $questionnaireTitle,
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
            'category' => 'required|in:peer_teacher,head_teacher',
            'evaluatee_id' => 'required|integer|exists:teacher,id',
            'questionnaire_id' => 'nullable|integer',
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

        $evaluateeQuery = Teacher::query()
            ->where('id', $data['evaluatee_id'])
            ->where('id', '!=', $teacherId)
            ->where('branch_id', $teacher->branch_id)
            ->where('department_id', $teacher->department_id)
            ->where('is_deleted', 0)
            ->where('is_activated', 1);

        if ($data['category'] === 'head_teacher') {
            $evaluateeQuery->whereRaw('LOWER(COALESCE(role, "")) LIKE ?', ['%program chair%']);
        } else {
            $evaluateeQuery
                ->whereRaw('LOWER(COALESCE(role, "")) NOT LIKE ?', ['%program chair%'])
                ->when($teacher->program_id, fn ($query) => $query->where('program_id', $teacher->program_id))
                ->when(! $teacher->program_id && $teacher->strand_id, fn ($query) => $query->where('strand_id', $teacher->strand_id));
        }

        $evaluatee = $evaluateeQuery->first();

        if (! $evaluatee) {
            return redirect()->route('portal.teacher.dashboard')->with('error', $data['category'] === 'head_teacher'
                ? 'School head not found in your assigned scope.'
                : 'Co-teacher not found in your assigned scope.');
        }

        $questionnaireId = $evaluatee->questionnaire_id ? (int) $evaluatee->questionnaire_id : null;
        $allowedQuestionIds = $this->questionnaireQuestions($questionnaireId)
            ->pluck('question_id')
            ->map(fn ($id) => (int) $id);

        if ($allowedQuestionIds->isEmpty()) {
            return redirect()->route('portal.teacher.dashboard')
                ->with('error', 'No questionnaire is assigned to this faculty member yet.');
        }

        $submittedQuestionIds = collect($data['answers'])
            ->pluck('question_id')
            ->map(fn ($id) => (int) $id);

        if ($submittedQuestionIds->diff($allowedQuestionIds)->isNotEmpty()) {
            return back()->withErrors(['message' => 'Submitted answers do not match the assigned questionnaire.']);
        }

        $terms = array_values(array_unique(array_filter([
            $data['term'],
            ...$this->termOptions($data['term']),
        ])));

        $hasLegacyEvaluatorColumns = Schema::hasColumn('evaluation_submissions', 'evaluator_id')
            && Schema::hasColumn('evaluation_submissions', 'evaluatee_id');

        if ($hasLegacyEvaluatorColumns) {
            $already = DB::table('evaluation_submissions')
                ->where('evaluator_id', $teacherId)
                ->where('evaluator_type', 'teacher')
                ->where('evaluatee_id', $evaluatee->id)
                ->where('school_year', $data['school_year'])
                ->whereIn('term', $terms)
                ->where('category', $data['category'])
                ->exists();
        } else {
            $submissionIds = $this->teacherSubmissionIds($teacher);

            $already = empty($submissionIds)
                ? false
                : DB::table('evaluation_submissions')
                    ->whereIn('id', $submissionIds)
                    ->where('academic_year_id', $data['academic_year_id'])
                    ->where('questionnaire_id', $questionnaireId)
                    ->where('teacher_id', $evaluatee->id)
                    ->exists();
        }

        if ($already) {
            return redirect()->route('portal.teacher.dashboard')->with('error', $data['category'] === 'head_teacher'
                ? 'You have already submitted this school head evaluation.'
                : 'You have already submitted this faculty evaluation.');
        }

        $ratings = array_column($data['answers'], 'rating');
        $avg = count($ratings) ? round(array_sum($ratings) / count($ratings), 2) : 0;

        $submissionPayload = [
            'branch_id' => $teacher->branch_id,
            'academic_year_id' => $data['academic_year_id'],
            'questionnaire_type_id' => $this->questionnaireTypeId($questionnaireId),
            'questionnaire_id' => $questionnaireId,
            'answers' => json_encode($data['answers']),
            'comments' => json_encode(($data['comments'] ?? null) ? ['text' => $data['comments']] : []),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('evaluation_submissions', 'teacher_id')) {
            $submissionPayload['teacher_id'] = $evaluatee->id;
        }

        if (Schema::hasColumn('evaluation_submissions', 'overall_average')) {
            $submissionPayload['overall_average'] = $avg;
        }

        if (Schema::hasColumn('evaluation_submissions', 'submitted_at')) {
            $submissionPayload['submitted_at'] = now();
        }

        if ($hasLegacyEvaluatorColumns) {
            $submissionPayload += [
                'evaluator_id' => $teacherId,
                'evaluator_type' => 'teacher',
                'evaluatee_id' => $evaluatee->id,
                'evaluatee_type' => 'teacher',
                'category' => $data['category'],
                'subject_section_id' => null,
                'school_year' => $data['school_year'],
                'term' => $terms[0] ?? $data['term'],
                'overall_average' => $avg,
                'submitted_at' => now(),
            ];
        }

        $submissionId = (int) DB::table('evaluation_submissions')->insertGetId($submissionPayload);

        if (! $hasLegacyEvaluatorColumns) {
            $this->rememberTeacherSubmissionId($teacher, $submissionId);
        }

        $newItems = collect($data['answers'])
            ->groupBy('question_id')
            ->map(fn ($group) => round($group->avg('rating'), 2))
            ->toArray();

        if ($data['category'] === 'peer_teacher') {
            $existing = DB::table('ratings_peer')
                ->where('academic_year_id', $data['academic_year_id'])
                ->where('teacher_id', $evaluatee->id)
                ->first();

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
        }

        return redirect()->route('portal.teacher.dashboard')->with('success', $data['category'] === 'head_teacher'
            ? 'School head evaluation submitted. Thank you!'
            : 'Faculty evaluation submitted. Thank you!');
    }

    public function dashboard(): Response
    {
        $employeeId = (int) session('client_id');
        $teacher = Teacher::with(['branch', 'department', 'program', 'strand'])->findOrFail($employeeId);

        $cycle = $this->activeCycle();
        $classes = [];
        $pendingTargets = [];
        $headTargets = [];
        $evaluationForms = [];

        if ($cycle) {
            [$termA, $termB] = $this->termOptions($cycle->term ?? null);
            $schoolYear = trim("{$cycle->from_year}-{$cycle->to_year}");
            $semesterLabel = $this->semesterLabel($cycle->term ?? null);

            $classes = array_merge(
                $this->buildSubjectSectionClasses($employeeId, $schoolYear, [$termA, $termB]),
                $this->buildLegacyEducationLevelClasses($teacher, $semesterLabel),
            );

            $pendingTargets = $this->evaluationTargets($teacher, $schoolYear, [$termA, $termB], (int) $cycle->id, 'peer_teacher');
            $headTargets = $this->evaluationTargets($teacher, $schoolYear, [$termA, $termB], (int) $cycle->id, 'head_teacher');
            $allTargets = [...$pendingTargets, ...$headTargets];
            $submittedForms = $this->submittedFormsByTarget($teacher, $allTargets, $cycle);
            $evaluationForms = $this->evaluationFormsForTargets($allTargets, $cycle, $submittedForms);
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
            'headTargets' => $headTargets,
            'evaluationForms' => $evaluationForms,
        ]);
    }
}
