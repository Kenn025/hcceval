<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;
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

    private function legacyRegisteredSubjects(Student $student, ?object $cycle): array
    {
        $yearLevel = $student->yearLevel;

        if (! $yearLevel || ! Schema::hasTable('subject')) {
            return [];
        }

        $regularSubjectIds = collect($yearLevel->subject_id ?? [])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values();

        $removedSubjectIds = collect($student->removed_subject_map ?? [])
            ->keys()
            ->map(fn ($id) => (int) $id)
            ->values();

        $irregularSubjectIds = collect($student->irreg_subject_map ?? [])
            ->keys()
            ->map(fn ($id) => (int) $id)
            ->values();

        $subjectIds = $regularSubjectIds
            ->diff($removedSubjectIds)
            ->merge($irregularSubjectIds)
            ->unique()
            ->values();

        if ($subjectIds->isEmpty()) {
            return [];
        }

        $subjects = Subject::query()
            ->select('id', 'code', 'name', 'teacher_id', 'questionnaire_id')
            ->whereIn('id', $subjectIds)
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->get()
            ->keyBy('id');

        $teacherIds = collect($yearLevel->subject_teacher_map ?? [])
            ->merge($student->irreg_subject_map ?? [])
            ->values()
            ->merge($subjects->flatMap(fn (Subject $subject) => $subject->teacher_id ?? []))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $teacherNames = Teacher::query()
            ->select('id', 'firstname', 'middlename', 'lastname')
            ->whereIn('id', $teacherIds)
            ->get()
            ->mapWithKeys(fn (Teacher $teacher) => [$teacher->id => $teacher->full_name]);

        $semesterLabel = $cycle ? $this->semesterLabel($cycle->term ?? null) : 'Current Cycle';
        $sectionName = trim(implode(' ', array_filter([
            $yearLevel->year_level ? 'Year/Grade ' . $yearLevel->year_level : null,
            $yearLevel->section ? 'Section ' . $yearLevel->section : null,
        ])));

        return $subjectIds
            ->map(function (int $subjectId) use ($subjects, $yearLevel, $student, $teacherNames, $semesterLabel, $sectionName, $cycle) {
                $subject = $subjects->get($subjectId);

                if (! $subject) {
                    return null;
                }

                $teacherId = data_get($student->irreg_subject_map ?? [], (string) $subjectId)
                    ?: data_get($yearLevel->subject_teacher_map ?? [], (string) $subjectId)
                    ?: collect($subject->teacher_id ?? [])->filter()->first();
                $questionnaireId = $this->assignedQuestionnaireIdForSubject(
                    $subjectId,
                    $subject->questionnaire_id ? (int) $subject->questionnaire_id : null,
                    $student->branch_id ? (int) $student->branch_id : null,
                );
                $alreadyEvaluated = $this->studentHasEvaluationSubmission(
                    $student,
                    $cycle ? (int) $cycle->id : null,
                    $questionnaireId,
                    $teacherId ? (int) $teacherId : null,
                );

                return [
                    'section_id' => null,
                    'course_id' => $subject->id,
                    'course_code' => $subject->code,
                    'course_name' => $subject->name,
                    'section_name' => $sectionName,
                    'teacher_name' => $teacherId ? ($teacherNames[(int) $teacherId] ?? null) : null,
                    'teacher_id' => $teacherId ? (int) $teacherId : null,
                    'teacher_role' => 'Teacher',
                    'schedule' => null,
                    'room' => null,
                    'semester_label' => $semesterLabel,
                    'already_evaluated' => $alreadyEvaluated,
                    'registration_status' => 'Registered',
                    'can_evaluate' => ! empty($teacherId) && ! empty($questionnaireId),
                    'questionnaire_id' => $questionnaireId,
                ];
            })
            ->filter()
            ->sortBy('course_name')
            ->values()
            ->toArray();
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

    private function subjectTypeQuestions()
    {
        if (! Schema::hasTable('question') || ! Schema::hasTable('question_type')) {
            return collect();
        }

        return DB::table('question')
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->whereIn('question_type_id', DB::table('question_type')->where('code', 'like', '%subject%')->pluck('id'))
            ->select('id as question_id', 'description as question_text')
            ->orderBy('id')
            ->get();
    }

    private function assignedQuestionnaireIdForSubject(int $subjectId, ?int $directQuestionnaireId = null, ?int $branchId = null): ?int
    {
        if ($directQuestionnaireId) {
            return $directQuestionnaireId;
        }

        if (
            ! Schema::hasTable('questionnaire_distribution')
            || ! Schema::hasTable('questionnaires')
            || ! Schema::hasTable('questionnaire_type')
            || ! Schema::hasTable('subject')
        ) {
            return null;
        }

        $subject = DB::table('subject')
            ->select('department_id', 'program_id', 'strand_id')
            ->where('id', $subjectId)
            ->first();

        $distributions = DB::table('questionnaire_distribution as qd')
            ->join('questionnaires as q', 'q.id', '=', 'qd.questionnaire_id')
            ->join('questionnaire_type as qt', 'qt.id', '=', 'q.questionnaire_type_id')
            ->select('qd.questionnaire_id', 'qd.items')
            ->where('qd.is_activated', 1)
            ->where('qd.is_deleted', 0)
            ->where('q.is_activated', 1)
            ->where('q.is_deleted', 0)
            ->where('qt.code', 'QTYPE-SUBJECT')
            ->when($branchId, fn ($query) => $query->where(function ($sub) use ($branchId) {
                $sub->where('qd.branch_id', $branchId)->orWhereNull('qd.branch_id');
            }))
            ->orderByDesc('qd.id')
            ->get();

        foreach ($distributions as $distribution) {
            $items = json_decode($distribution->items ?? '[]', true) ?: [];
            $flatSubjectIds = collect($items)
                ->filter(fn ($item) => is_scalar($item) && (is_int($item) || ctype_digit((string) $item)))
                ->map(fn ($item) => (int) $item);

            if ($flatSubjectIds->contains($subjectId)) {
                return (int) $distribution->questionnaire_id;
            }

            foreach (($items['custom_scope_groups'] ?? []) as $group) {
                $groupSubjectIds = collect($group['subject_ids'] ?? [])->map(fn ($id) => (int) $id);

                if ($groupSubjectIds->contains($subjectId)) {
                    return (int) ($group['questionnaire_id'] ?? $distribution->questionnaire_id);
                }
            }

            if (collect($items['custom_subject_ids'] ?? [])->map(fn ($id) => (int) $id)->contains($subjectId)) {
                return (int) $distribution->questionnaire_id;
            }

            if (
                $subject
                && (
                    (! empty($items['department_id']) && (int) $items['department_id'] === (int) $subject->department_id)
                    || collect($items['program_ids'] ?? [])->map(fn ($id) => (int) $id)->contains((int) $subject->program_id)
                    || collect($items['strand_ids'] ?? [])->map(fn ($id) => (int) $id)->contains((int) $subject->strand_id)
                )
            ) {
                return (int) $distribution->questionnaire_id;
            }
        }

        return null;
    }

    private function legacySubjectEvaluationContext(Student $student, int $subjectId, ?object $cycle): ?object
    {
        $yearLevel = $student->yearLevel;

        if (! $yearLevel || ! $cycle || ! Schema::hasTable('subject')) {
            return null;
        }

        $regularSubjectIds = collect($yearLevel->subject_id ?? [])->map(fn ($id) => (int) $id);
        $removedSubjectIds = collect($student->removed_subject_map ?? [])->keys()->map(fn ($id) => (int) $id);
        $irregularSubjectIds = collect($student->irreg_subject_map ?? [])->keys()->map(fn ($id) => (int) $id);
        $registeredSubjectIds = $regularSubjectIds
            ->diff($removedSubjectIds)
            ->merge($irregularSubjectIds)
            ->unique()
            ->values();

        if (! $registeredSubjectIds->contains($subjectId)) {
            return null;
        }

        $subject = Subject::query()
            ->select('id', 'code', 'name', 'teacher_id', 'questionnaire_id')
            ->where('id', $subjectId)
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->first();

        if (! $subject) {
            return null;
        }

        $teacherId = data_get($student->irreg_subject_map ?? [], (string) $subjectId)
            ?: data_get($yearLevel->subject_teacher_map ?? [], (string) $subjectId)
            ?: collect($subject->teacher_id ?? [])->filter()->first();

        if (! $teacherId) {
            return null;
        }

        $teacher = Teacher::query()
            ->select('id', 'firstname', 'middlename', 'lastname', 'role')
            ->where('id', (int) $teacherId)
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->first();

        if (! $teacher) {
            return null;
        }

        [$termA] = $this->termOptions($cycle->term ?? null);

        return (object) [
            'id' => null,
            'subject_id' => $subject->id,
            'teacher_employee_id' => $teacher->id,
            'school_year' => "{$cycle->from_year}-{$cycle->to_year}",
            'term' => $termA,
            'questionnaire_id' => $this->assignedQuestionnaireIdForSubject(
                (int) $subject->id,
                $subject->questionnaire_id ? (int) $subject->questionnaire_id : null,
                $student->branch_id ? (int) $student->branch_id : null,
            ),
            'subject_code' => $subject->code,
            'subject_name' => $subject->name,
            'teacher_name' => $teacher->full_name,
            'teacher_role' => $teacher->role ?? 'Teacher',
            'evaluatee_type' => 'teacher',
        ];
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

    private function studentHasEvaluationSubmission(Student $student, ?int $academicYearId, ?int $questionnaireId, ?int $teacherId): bool
    {
        if (! $academicYearId || ! $questionnaireId || ! $teacherId || ! Schema::hasTable('evaluation_submissions')) {
            return false;
        }

        $submissionIds = collect($student->evaluation_submission_ids ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        if ($submissionIds->isEmpty()) {
            return false;
        }

        return DB::table('evaluation_submissions')
            ->whereIn('id', $submissionIds->all())
            ->where('academic_year_id', $academicYearId)
            ->where('questionnaire_id', $questionnaireId)
            ->where('teacher_id', $teacherId)
            ->exists();
    }

    public function evaluateForm(Request $request): Response|RedirectResponse
    {
        $studentId = (int) session('client_id');
        $subjectSectionId = (int) $request->query('subject_section_id');
        $subjectId = (int) $request->query('subject_id');
        $category = $request->query('category', 'teacher_subject');
        $cycle = $this->activeCycle();

        if (
            ! Schema::hasTable('evaluation_submissions')
            || ! Schema::hasTable('subject')
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

        $student = Student::with('yearLevel')->findOrFail($studentId);
        $subjectSection = null;

        if ($subjectSectionId > 0 && Schema::hasTable('student_enrollments') && Schema::hasTable('subject_sections')) {
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
                    'subj.questionnaire_id',
                    'subj.code as subject_code',
                    'subj.name as subject_name',
                    DB::raw("TRIM(CONCAT(e.firstname, ' ', COALESCE(e.middlename, ''), ' ', e.lastname)) as teacher_name"),
                    DB::raw("COALESCE(e.role, 'Teacher') as teacher_role"),
                    DB::raw("'employee' as evaluatee_type")
                )
                ->where('se.student_id', $studentId)
                ->where('se.status', 'enrolled')
                ->where('ss.id', $subjectSectionId)
                ->where('ss.school_year', $schoolYear)
                ->whereIn('ss.term', [$termA, $termB])
                ->where('ss.is_active', 1)
                ->whereNull('ss.deleted_at')
                ->first();
        } elseif ($subjectId > 0) {
            $subjectSection = $this->legacySubjectEvaluationContext($student, $subjectId, $cycle);
        }

        if (! $subjectSection) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'Subject not found for this student.');
        }

        if (! $subjectSection->teacher_employee_id) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'No teacher is assigned to this subject section.');
        }

        $studentBranchId = (int) DB::table('student')->where('id', $studentId)->value('branch_id');
        $questionnaireId = (int) ($this->assignedQuestionnaireIdForSubject(
            (int) $subjectSection->subject_id,
            $subjectSection->questionnaire_id ? (int) $subjectSection->questionnaire_id : null,
            $studentBranchId ?: null,
        ) ?? 0);
        $questions = $this->questionnaireQuestions($questionnaireId);

        if ($questions->isEmpty()) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'No questionnaire is assigned to this subject yet.');
        }

        return Inertia::render('Student/EvaluateForm', [
            'category' => $category,
            'questionnaireId' => $questionnaireId,
            'evaluatee' => [
                'id' => $subjectSection->teacher_employee_id,
                'name' => trim((string) $subjectSection->teacher_name),
                'role' => $subjectSection->teacher_role ?? 'Teacher',
                'type' => $subjectSection->evaluatee_type ?? 'employee',
            ],
            'subjectSectionId' => $subjectSection->id,
            'subjectId' => $subjectSection->subject_id,
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
            'subject_section_id' => 'nullable|integer',
            'subject_id' => 'nullable|integer',
            'questionnaire_id' => 'nullable|integer',
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
            || ! Schema::hasTable('subject')
        ) {
            return back()->withErrors(['message' => 'Submissions storage is not available.']);
        }

        $terms = array_values(array_unique(array_filter([
            $data['term'],
            ...$this->termOptions($data['term']),
        ])));

        $student = Student::with('yearLevel')->findOrFail($studentId);
        $subjectSectionId = (int) ($data['subject_section_id'] ?? 0);
        $subjectId = (int) ($data['subject_id'] ?? 0);
        $subjectSection = null;

        if ($subjectSectionId > 0 && Schema::hasTable('student_enrollments') && Schema::hasTable('subject_sections')) {
            $subjectSection = DB::table('student_enrollments as se')
                ->join('subject_sections as ss', 'ss.id', '=', 'se.subject_section_id')
                ->join('subject as subj', 'subj.id', '=', 'ss.subject_id')
                ->select('ss.id', 'ss.subject_id', 'ss.teacher_employee_id', 'ss.school_year', 'ss.term', 'subj.questionnaire_id', DB::raw("'employee' as evaluatee_type"))
                ->where('se.student_id', $studentId)
                ->where('se.status', 'enrolled')
                ->where('ss.id', $subjectSectionId)
                ->where('ss.school_year', $data['school_year'])
                ->whereIn('ss.term', $terms)
                ->where('ss.is_active', 1)
                ->whereNull('ss.deleted_at')
                ->first();
        } elseif ($subjectId > 0) {
            $subjectSection = $this->legacySubjectEvaluationContext($student, $subjectId, $this->activeCycle());
        }

        if (! $subjectSection) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'Subject not found for this student.');
        }

        if (! $subjectSection->teacher_employee_id) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'No teacher is assigned to this subject section.');
        }

        $studentBranchId = (int) DB::table('student')->where('id', $studentId)->value('branch_id');
        $questionnaireId = (int) ($this->assignedQuestionnaireIdForSubject(
            (int) $subjectSection->subject_id,
            $subjectSection->questionnaire_id ? (int) $subjectSection->questionnaire_id : null,
            $studentBranchId ?: null,
        ) ?? 0);
        $allowedQuestionIds = $this->questionnaireQuestions($questionnaireId)
            ->pluck('question_id')
            ->map(fn ($id) => (int) $id);

        if ($allowedQuestionIds->isEmpty()) {
            $allowedQuestionIds = $this->subjectTypeQuestions()
                ->pluck('question_id')
                ->map(fn ($id) => (int) $id);
        }

        $submittedQuestionIds = collect($data['answers'])
            ->pluck('question_id')
            ->map(fn ($id) => (int) $id);

        if ($allowedQuestionIds->isNotEmpty() && $submittedQuestionIds->diff($allowedQuestionIds)->isNotEmpty()) {
            return back()->withErrors(['message' => 'Submitted answers do not match the assigned questionnaire.']);
        }

        $already = $this->studentHasEvaluationSubmission(
            $student,
            (int) $data['academic_year_id'],
            $questionnaireId ?: null,
            $subjectSection->teacher_employee_id ? (int) $subjectSection->teacher_employee_id : null,
        );

        if ($already) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'You have already submitted this evaluation.');
        }

        $ratings = array_column($data['answers'], 'rating');
        $avg = count($ratings) ? round(array_sum($ratings) / count($ratings), 2) : 0;

        try {
            DB::transaction(function () use ($student, $subjectSection, $data, $questionnaireId) {
                $questionnaireTypeId = $this->questionnaireTypeId($questionnaireId);
                $comments = $data['comments'] ?? null;

                $submissionId = (int) DB::table('evaluation_submissions')->insertGetId([
                    'branch_id' => $student->branch_id,
                    'academic_year_id' => $data['academic_year_id'],
                    'questionnaire_type_id' => $questionnaireTypeId,
                    'questionnaire_id' => $questionnaireId ?: null,
                    'teacher_id' => $subjectSection->teacher_employee_id,
                    'answers' => json_encode($data['answers']),
                    'comments' => json_encode($comments ? ['text' => $comments] : []),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $submissionIds = collect($student->evaluation_submission_ids ?? [])
                    ->map(fn ($id) => (int) $id)
                    ->push($submissionId)
                    ->unique()
                    ->values()
                    ->all();

                $student->forceFill([
                    'evaluation_submission_ids' => $submissionIds,
                ])->save();
            });
        } catch (Throwable $exception) {
            report($exception);

            return back()->withErrors(['message' => 'Evaluation could not be saved. Please try again.']);
        }

        $newItems = collect($data['answers'])
            ->groupBy('question_id')
            ->map(fn ($group) => round($group->avg('rating'), 2))
            ->toArray();

        $ratingPersonColumn = Schema::hasColumn('ratings_subject', 'employee_id') ? 'employee_id' : 'teacher_id';
        $canAggregateRating = $ratingPersonColumn === 'teacher_id'
            || DB::table('employee')->where('id', $subjectSection->teacher_employee_id)->exists();

        if (! $canAggregateRating) {
            return redirect()->route('portal.student.dashboard')->with('success', 'Evaluation submitted. Thank you!');
        }

        $existing = DB::table('ratings_subject')
            ->where('academic_year_id', $data['academic_year_id'])
            ->where('subject_id', $subjectSection->subject_id)
            ->where($ratingPersonColumn, $subjectSection->teacher_employee_id)
            ->first();

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
                $ratingPersonColumn => $subjectSection->teacher_employee_id,
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
            Schema::hasTable('subject') &&
            Schema::hasTable('evaluation_submissions')
        ) {
            [$termA, $termB] = $this->termOptions($cycle->term ?? null);
            $schoolYear      = trim("{$cycle->from_year}-{$cycle->to_year}");

            // My subjects for current cycle (read-only — no evaluate button)
            $subjects = DB::table('student_enrollments as se')
                ->join('subject_sections as ss', 'ss.id', '=', 'se.subject_section_id')
                ->join('sections as sec', 'sec.id', '=', 'ss.section_id')
                ->join('subject as subj', 'subj.id', '=', 'ss.subject_id')
                ->leftJoin('employee as e', 'e.id', '=', 'ss.teacher_employee_id')
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
                    'subj.questionnaire_id',
                    'ss.teacher_employee_id as teacher_id',
                    DB::raw("TRIM(CONCAT(e.firstname, ' ', COALESCE(e.middlename, ''), ' ', e.lastname)) as teacher_name"),
                    DB::raw("COALESCE(e.role, 'teacher') as teacher_role")
                )
                ->where('se.student_id', $studentId)
                ->where('se.status', 'enrolled')
                ->where('ss.is_active', 1)
                ->whereNull('ss.deleted_at')
                ->where('ss.school_year', $schoolYear)
                ->whereIn('ss.term', [$termA, $termB])
                ->orderBy('subj.name')
                ->get()
                ->map(function ($row) use ($student, $cycle) {
                    $questionnaireId = $this->assignedQuestionnaireIdForSubject(
                        (int) $row->course_id,
                        $row->questionnaire_id ? (int) $row->questionnaire_id : null,
                        $student->branch_id ? (int) $student->branch_id : null,
                    );
                    $alreadyEvaluated = $this->studentHasEvaluationSubmission(
                        $student,
                        $cycle ? (int) $cycle->id : null,
                        $questionnaireId,
                        $row->teacher_id ? (int) $row->teacher_id : null,
                    );

                    return array_merge((array) $row, [
                        'questionnaire_id' => $questionnaireId,
                        'semester_label' => $this->semesterLabel($row->term),
                        'already_evaluated' => $alreadyEvaluated,
                        'can_evaluate' => ! empty($questionnaireId) && ! empty($row->teacher_name),
                    ]);
                })
                ->toArray();

            $evaluations = [];
            $archive = [];
        }

        if (empty($subjects)) {
            $subjects = $this->legacyRegisteredSubjects($student, $cycle);
        }

        $evaluationForms = collect($subjects)
            ->filter(fn ($subject) => ! empty($subject['can_evaluate']) && empty($subject['already_evaluated']))
            ->mapWithKeys(function ($subject) use ($cycle) {
                $questionnaireId = (int) ($subject['questionnaire_id'] ?? 0);
                $questions = $this->questionnaireQuestions($questionnaireId);

                if (! $cycle || ! $questionnaireId || $questions->isEmpty()) {
                    return [];
                }

                return [(string) ($subject['section_id'] ?? $subject['course_id']) => [
                    'category' => 'teacher_subject',
                    'questionnaireId' => $questionnaireId,
                    'evaluatee' => [
                        'id' => $subject['teacher_id'] ?? null,
                        'name' => $subject['teacher_name'] ?? '',
                        'role' => $subject['teacher_role'] ?? 'Teacher',
                    ],
                    'subjectSectionId' => $subject['section_id'] ?? null,
                    'subjectId' => $subject['course_id'] ?? null,
                    'subjectInfo' => [
                        'code' => $subject['course_code'] ?? '',
                        'name' => $subject['course_name'] ?? '',
                    ],
                    'questions' => $questions,
                    'cycle' => [
                        'id' => $cycle->id,
                        'school_year' => "{$cycle->from_year}-{$cycle->to_year}",
                        'semester' => $this->semesterLabel($cycle->term ?? null),
                        'term' => $subject['term'] ?? ($cycle->term ?? null),
                    ],
                ]];
            })
            ->toArray();

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
            'evaluationForms' => $evaluationForms,
        ]);
    }
}
