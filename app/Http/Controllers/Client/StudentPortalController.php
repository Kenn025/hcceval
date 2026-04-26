<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Employee;
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

    private function fullNameExpression(string $prefix = ''): string
    {
        $first = $prefix . 'firstname';
        $middle = $prefix . 'middlename';
        $last = $prefix . 'lastname';

        if (DB::getDriverName() === 'sqlite') {
            return "TRIM({$first} || ' ' || COALESCE({$middle}, '') || ' ' || {$last})";
        }

        return "TRIM(CONCAT({$first}, ' ', COALESCE({$middle}, ''), ' ', {$last}))";
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
            ->map(function (int $subjectId) use ($subjects, $yearLevel, $student, $teacherNames, $semesterLabel, $sectionName, $cycle, $irregularSubjectIds) {
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
                    $subject->id ? (int) $subject->id : null,
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
                    'is_irregular' => $irregularSubjectIds->contains($subjectId),
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
        $questionEntries = collect($items['scale_questions'] ?? [])
            ->flatMap(fn ($group) => collect($group['questions'] ?? [])->map(fn ($id) => [
                'question_id' => (int) $id,
                'class_name' => $group['class_name'] ?? '',
                'weight_percentage' => $group['weight_percentage'] ?? null,
            ]))
            ->filter(fn ($entry) => ! empty($entry['question_id']))
            ->values();
        $questionIds = $questionEntries
            ->pluck('question_id')
            ->unique()
            ->values();

        if ($questionIds->isEmpty() && is_array($items)) {
            $questionIds = collect($items)
                ->filter(fn ($id) => is_scalar($id) && (is_int($id) || ctype_digit((string) $id)))
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();
            $questionEntries = $questionIds->map(fn ($id) => [
                'question_id' => $id,
                'class_name' => '',
                'weight_percentage' => null,
            ]);
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

        return $questionEntries
            ->map(function ($entry) use ($questions) {
                $question = $questions->get($entry['question_id']);

                return $question ? (object) array_merge((array) $question, [
                    'class_name' => $entry['class_name'],
                    'weight_percentage' => $entry['weight_percentage'],
                ]) : null;
            })
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

    private function questionnaireTypeIdByCode(string $code): ?int
    {
        if (! Schema::hasTable('questionnaire_type')) {
            return null;
        }

        $typeId = DB::table('questionnaire_type')
            ->where('code', $code)
            ->value('id');

        return $typeId ? (int) $typeId : null;
    }

    private function studentHasEvaluationSubmission(Student $student, ?int $academicYearId, ?int $questionnaireId, ?int $subjectId): bool
    {
        if (! $academicYearId || ! $questionnaireId || ! $subjectId || ! Schema::hasTable('evaluation_submissions')) {
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
            ->where('subject_id', $subjectId)
            ->exists();
    }

    private function studentHasTargetSubmission(Student $student, ?int $academicYearId, ?int $questionnaireId, ?int $teacherId): bool
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
            ->where('questionnaire_type_id', $this->questionnaireTypeIdByCode('QTYPE-HEAD'))
            ->where('teacher_id', $teacherId)
            ->exists();
    }

    private function programChairTargets(Student $student, ?object $cycle): array
    {
        if (! $cycle || ! Schema::hasTable('teacher') || ! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $targets = Teacher::query()
            ->with(['program:id,name', 'strand:id,name', 'department:id,name'])
            ->where('branch_id', $student->branch_id)
            ->where('department_id', $student->department_id)
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->whereRaw('LOWER(COALESCE(role, "")) LIKE ?', ['%program chair%'])
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->get();

        $questionnaires = Schema::hasTable('questionnaires')
            ? DB::table('questionnaires')
                ->select('id', 'code', 'title')
                ->whereIn('id', $targets->pluck('questionnaire_id')->filter()->unique()->values())
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->get()
                ->keyBy('id')
            : collect();

        return $targets
            ->map(fn (Teacher $target) => [
                'id' => $target->id,
                'form_key' => 'program_chair:' . $target->id,
                'name' => $target->full_name,
                'role' => $target->role ?? 'Program Chair',
                'scope' => $target->program?->name ?? $target->strand?->name ?? $target->department?->name ?? '',
                'scoped' => (
                    (! empty($student->program_id) && (int) $target->program_id === (int) $student->program_id)
                    || (! empty($student->strand_id) && empty($student->program_id) && (int) $target->strand_id === (int) $student->strand_id)
                ),
                'questionnaire_id' => $target->questionnaire_id ? (int) $target->questionnaire_id : null,
                'questionnaire_code' => $target->questionnaire_id
                    ? data_get($questionnaires->get((int) $target->questionnaire_id), 'code')
                    : null,
                'questionnaire_title' => $target->questionnaire_id
                    ? data_get($questionnaires->get((int) $target->questionnaire_id), 'title')
                    : null,
                'category' => 'program_chair',
                'done' => $this->studentHasTargetSubmission(
                    $student,
                    (int) $cycle->id,
                    $target->questionnaire_id ? (int) $target->questionnaire_id : null,
                    (int) $target->id,
                ),
            ])
            ->values()
            ->all();
    }

    private function submittedProgramChairForms(Student $student, array $targets, ?object $cycle): array
    {
        if (! $cycle || empty($targets) || ! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $submissionIds = collect($student->evaluation_submission_ids ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        if ($submissionIds->isEmpty()) {
            return [];
        }

        $targetIds = collect($targets)->pluck('id')->map(fn ($id) => (int) $id)->values();

        return DB::table('evaluation_submissions')
            ->select('id', 'questionnaire_type_id', 'teacher_id', 'answers', 'comments', 'submitted_at', 'created_at')
            ->whereIn('id', $submissionIds->all())
            ->where('academic_year_id', (int) $cycle->id)
            ->where('questionnaire_type_id', $this->questionnaireTypeIdByCode('QTYPE-HEAD'))
            ->whereIn('teacher_id', $targetIds->all())
            ->orderByDesc('submitted_at')
            ->orderByDesc('created_at')
            ->get()
            ->mapWithKeys(function ($row) {
                $comments = json_decode($row->comments ?? '{}', true) ?: [];

                return [(string) $row->teacher_id => [
                    'id' => (int) $row->id,
                    'questionnaire_type_id' => $row->questionnaire_type_id ? (int) $row->questionnaire_type_id : null,
                    'answers' => json_decode($row->answers ?? '[]', true) ?: [],
                    'comments' => $comments['text'] ?? null,
                    'submitted_at' => $row->submitted_at ?? $row->created_at,
                ]];
            })
            ->all();
    }

    private function studentHasEmployeeSubmission(Student $student, ?int $academicYearId, ?int $questionnaireId, ?int $employeeId): bool
    {
        if (! $academicYearId || ! $questionnaireId || ! $employeeId || ! Schema::hasTable('evaluation_submissions')) {
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
            ->where('questionnaire_type_id', $this->questionnaireTypeIdByCode('QTYPE-EMPLOYEE'))
            ->where('employee_id', $employeeId)
            ->exists();
    }

    private function branchEmployeesForStudent(Student $student, ?object $cycle): array
    {
        if (! $cycle || ! Schema::hasTable('employee') || ! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $employeeDepartmentTable = Schema::hasTable('employee_departments')
            ? 'employee_departments'
            : (Schema::hasTable('employee_department') ? 'employee_department' : null);
        $hasEmployeeDepartmentColumn = Schema::hasColumn('employee', 'employee_department_id');
        $hasEmployeeQuestionnaireId = Schema::hasColumn('employee', 'questionnaire_id');

        $query = DB::table('employee as e')
            ->select(
                'e.id',
                'e.code',
                'e.firstname',
                'e.middlename',
                'e.lastname',
                'e.role',
                'e.email',
                'e.branch_id'
            )
            ->where('e.branch_id', $student->branch_id)
            ->where('e.is_deleted', 0)
            ->where('e.is_activated', 1)
            ->orderBy('e.lastname')
            ->orderBy('e.firstname');

        if ($hasEmployeeQuestionnaireId && Schema::hasTable('questionnaires')) {
            $query
                ->leftJoin('questionnaires as qn', 'qn.id', '=', 'e.questionnaire_id')
                ->addSelect(
                    'e.questionnaire_id',
                    'qn.code as questionnaire_code',
                    'qn.title as questionnaire_title'
                );
        } else {
            $query->addSelect(
                DB::raw('NULL as questionnaire_id'),
                DB::raw('NULL as questionnaire_code'),
                DB::raw('NULL as questionnaire_title')
            );
        }

        if ($employeeDepartmentTable && $hasEmployeeDepartmentColumn) {
            $query
                ->leftJoin($employeeDepartmentTable . ' as ed', 'ed.id', '=', 'e.employee_department_id')
                ->addSelect(
                    'e.employee_department_id',
                    'ed.name as employee_department_name',
                    'ed.code as employee_department_code'
                );
        } else {
            $query->addSelect(
                DB::raw('NULL as employee_department_id'),
                DB::raw('NULL as employee_department_name'),
                DB::raw('NULL as employee_department_code')
            );
        }

        return $query
            ->get()
            ->map(fn ($employee) => [
                'id' => (int) $employee->id,
                'form_key' => 'employee-' . (int) $employee->id,
                'code' => $employee->code,
                'name' => trim(collect([$employee->firstname, $employee->middlename, $employee->lastname])->filter()->implode(' ')),
                'role' => $employee->role ?? 'Employee',
                'scope' => $employee->employee_department_name ?? '',
                'email' => $employee->email,
                'branch_id' => $employee->branch_id,
                'employee_department_id' => $employee->employee_department_id,
                'employee_department_name' => $employee->employee_department_name,
                'employee_department_code' => $employee->employee_department_code,
                'questionnaire_id' => $employee->questionnaire_id ? (int) $employee->questionnaire_id : null,
                'questionnaire_code' => $employee->questionnaire_code,
                'questionnaire_title' => $employee->questionnaire_title,
                'category' => 'employee_evaluation',
                'done' => $this->studentHasEmployeeSubmission(
                    $student,
                    (int) $cycle->id,
                    $employee->questionnaire_id ? (int) $employee->questionnaire_id : null,
                    (int) $employee->id,
                ),
            ])
            ->values()
            ->all();
    }

    private function submittedEmployeeForms(Student $student, array $employees, ?object $cycle): array
    {
        if (! $cycle || empty($employees) || ! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $submissionIds = collect($student->evaluation_submission_ids ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        if ($submissionIds->isEmpty()) {
            return [];
        }

        $employeeIds = collect($employees)->pluck('id')->map(fn ($id) => (int) $id)->values();

        return DB::table('evaluation_submissions')
            ->select('id', 'questionnaire_type_id', 'employee_id', 'answers', 'comments', 'submitted_at', 'created_at')
            ->whereIn('id', $submissionIds->all())
            ->where('academic_year_id', (int) $cycle->id)
            ->where('questionnaire_type_id', $this->questionnaireTypeIdByCode('QTYPE-EMPLOYEE'))
            ->whereIn('employee_id', $employeeIds->all())
            ->orderByDesc('submitted_at')
            ->orderByDesc('created_at')
            ->get()
            ->mapWithKeys(function ($row) {
                $comments = json_decode($row->comments ?? '{}', true) ?: [];

                return ['employee-' . (int) $row->employee_id => [
                    'id' => (int) $row->id,
                    'questionnaire_type_id' => $row->questionnaire_type_id ? (int) $row->questionnaire_type_id : null,
                    'answers' => json_decode($row->answers ?? '[]', true) ?: [],
                    'comments' => $comments['text'] ?? null,
                    'submitted_at' => $row->submitted_at ?? $row->created_at,
                ]];
            })
            ->all();
    }

    private function evaluationFormsForProgramChairs(array $targets, ?object $cycle, array $submittedForms = []): array
    {
        if (! $cycle) {
            return [];
        }

        $forms = [];

        foreach ($targets as $target) {
            $questionnaireId = (int) ($target['questionnaire_id'] ?? 0);
            $questions = $this->questionnaireQuestions($questionnaireId);

            if (! $questionnaireId || $questions->isEmpty()) {
                continue;
            }

            $formKey = (string) ($target['form_key'] ?? ('program_chair:' . $target['id']));

            $forms[$formKey] = [
                'category' => 'program_chair',
                'questionnaireId' => $questionnaireId,
                'questionnaireTypeId' => $this->questionnaireTypeId($questionnaireId),
                'questionnaireTitle' => $target['questionnaire_title'] ?? null,
                'submission' => $submittedForms[(string) $target['id']] ?? null,
                'evaluatee' => [
                    'id' => $target['id'],
                    'name' => $target['name'],
                    'role' => $target['role'] ?? 'Program Chair',
                    'scope' => $target['scope'] ?? '',
                ],
                'questions' => $questions->values()->all(),
                'cycle' => [
                    'id' => $cycle->id,
                    'school_year' => "{$cycle->from_year}-{$cycle->to_year}",
                    'semester' => $this->semesterLabel($cycle->term ?? null),
                    'term' => $cycle->term,
                ],
            ];
        }

        return $forms;
    }

    private function evaluationFormsForEmployees(array $employees, ?object $cycle, array $submittedForms = []): array
    {
        if (! $cycle) {
            return [];
        }

        $forms = [];

        foreach ($employees as $employee) {
            $questionnaireId = (int) ($employee['questionnaire_id'] ?? 0);
            $questions = $this->questionnaireQuestions($questionnaireId);

            if (! $questionnaireId || $questions->isEmpty()) {
                continue;
            }

            $formKey = (string) ($employee['form_key'] ?? ('employee-' . $employee['id']));

            $forms[$formKey] = [
                'category' => 'employee_evaluation',
                'questionnaireId' => $questionnaireId,
                'questionnaireTypeId' => $this->questionnaireTypeId($questionnaireId),
                'questionnaireTitle' => $employee['questionnaire_title'] ?? null,
                'submission' => $submittedForms[$formKey] ?? null,
                'evaluatee' => [
                    'id' => $employee['id'],
                    'name' => $employee['name'],
                    'role' => $employee['role'] ?? 'Employee',
                    'scope' => $employee['employee_department_name'] ?? '',
                ],
                'questions' => $questions->values()->all(),
                'cycle' => [
                    'id' => $cycle->id,
                    'school_year' => "{$cycle->from_year}-{$cycle->to_year}",
                    'semester' => $this->semesterLabel($cycle->term ?? null),
                    'term' => $cycle->term,
                ],
            ];
        }

        return $forms;
    }

    private function studentEvaluationRecords(Student $student, ?object $cycle, array $subjects): array
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return ['current' => [], 'archive' => []];
        }

        $submissionIds = collect($student->evaluation_submission_ids ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        if ($submissionIds->isEmpty()) {
            return ['current' => [], 'archive' => []];
        }

        $subjectLookup = collect($subjects)
            ->filter(fn ($subject) => ! empty($subject['questionnaire_id']) && ! empty($subject['course_id']))
            ->mapWithKeys(fn ($subject) => [
                ((int) $subject['questionnaire_id']) . ':' . ((int) $subject['course_id']) => $subject,
            ]);

        $questionIds = DB::table('evaluation_submissions')
            ->whereIn('id', $submissionIds->all())
            ->pluck('answers')
            ->flatMap(function ($answers) {
                return collect(json_decode($answers ?? '[]', true) ?: [])
                    ->pluck('question_id')
                    ->map(fn ($id) => (int) $id);
            })
            ->filter()
            ->unique()
            ->values();

        $questionTexts = $questionIds->isNotEmpty() && Schema::hasTable('question')
            ? DB::table('question')
                ->whereIn('id', $questionIds->all())
                ->pluck('description', 'id')
            : collect();

        $academicYearIds = DB::table('evaluation_submissions')
            ->whereIn('id', $submissionIds->all())
            ->pluck('academic_year_id')
            ->filter()
            ->unique()
            ->values();
        $academicYears = $academicYearIds->isNotEmpty() && Schema::hasTable('academic_year')
            ? DB::table('academic_year')
                ->whereIn('id', $academicYearIds->all())
                ->select('id', 'from_year', 'to_year', 'term')
                ->get()
                ->keyBy('id')
            : collect();
        $teacherIds = DB::table('evaluation_submissions')
            ->whereIn('id', $submissionIds->all())
            ->pluck('teacher_id')
            ->filter()
            ->unique()
            ->values();
        $teacherNames = $teacherIds->isNotEmpty() && Schema::hasTable('teacher')
            ? Teacher::query()
                ->whereIn('id', $teacherIds->all())
                ->get()
                ->mapWithKeys(fn (Teacher $teacher) => [$teacher->id => $teacher->full_name])
            : collect();
        $employeeIds = DB::table('evaluation_submissions')
            ->whereIn('id', $submissionIds->all())
            ->pluck('employee_id')
            ->filter()
            ->unique()
            ->values();
        $employeeNames = $employeeIds->isNotEmpty() && Schema::hasTable('employee')
            ? Employee::query()
                ->whereIn('id', $employeeIds->all())
                ->get()
                ->mapWithKeys(fn (Employee $employee) => [$employee->id => $employee->full_name])
            : collect();

        $activeAcademicYearId = $cycle ? (int) $cycle->id : null;
        $records = DB::table('evaluation_submissions')
            ->whereIn('id', $submissionIds->all())
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($row) use ($subjectLookup, $questionTexts, $academicYears, $teacherNames, $employeeNames) {
                $answers = collect(json_decode($row->answers ?? '[]', true) ?: [])
                    ->map(function ($answer) use ($questionTexts) {
                        $questionId = (int) ($answer['question_id'] ?? 0);
                        $rating = (int) ($answer['rating'] ?? 0);

                        return [
                            'question_id' => $questionId,
                            'question_text' => $questionTexts[$questionId] ?? ('Question #' . $questionId),
                            'rating' => $rating,
                        ];
                    })
                    ->values();

                $comments = json_decode($row->comments ?? '{}', true) ?: [];
                $subject = $subjectLookup->get(((int) $row->questionnaire_id) . ':' . ((int) $row->subject_id), []);
                $academicYear = $academicYears->get((int) $row->academic_year_id);
                $schoolYear = $academicYear
                    ? "{$academicYear->from_year}-{$academicYear->to_year}"
                    : ($subject['school_year'] ?? null);
                $semesterLabel = $academicYear
                    ? $this->semesterLabel($academicYear->term)
                    : (isset($subject['term']) ? $this->semesterLabel($subject['term']) : null);
                $ratings = $answers->pluck('rating')->filter();
                $questionnaireTypeId = $row->questionnaire_type_id ? (int) $row->questionnaire_type_id : null;
                $evaluateeName = match ($questionnaireTypeId) {
                    3 => $teacherNames[(int) $row->teacher_id] ?? 'School Head',
                    4 => $employeeNames[(int) $row->employee_id] ?? 'Employee',
                    default => $subject['teacher_name'] ?? ($teacherNames[(int) $row->teacher_id] ?? 'Teacher'),
                };

                return [
                    'submission_id' => (int) $row->id,
                    'questionnaire_type_id' => $questionnaireTypeId,
                    'subject_id' => $row->subject_id ? (int) $row->subject_id : null,
                    'course_code' => $subject['course_code'] ?? null,
                    'course_name' => $subject['course_name'] ?? null,
                    'evaluatee_name' => $evaluateeName,
                    'teacher_name' => $questionnaireTypeId === 1 ? $evaluateeName : null,
                    'questionnaire_id' => $row->questionnaire_id ? (int) $row->questionnaire_id : null,
                    'academic_year_id' => $row->academic_year_id ? (int) $row->academic_year_id : null,
                    'school_year' => $schoolYear,
                    'semester_label' => $semesterLabel,
                    'archive_group_label' => trim(($schoolYear ?? 'Unknown Academic Year') . ' · ' . ($semesterLabel ?? 'Unknown Term')),
                    'submitted_at' => $row->submitted_at ?? $row->created_at,
                    'overall_average' => $ratings->isNotEmpty() ? round($ratings->avg(), 2) : null,
                    'answers' => $answers->all(),
                    'comments' => $comments['text'] ?? null,
                ];
            })
            ->values();

        return [
            'current' => $records
                ->filter(fn ($record) => $activeAcademicYearId && (int) $record['academic_year_id'] === $activeAcademicYearId)
                ->values()
                ->all(),
            'archive' => $records
                ->reject(fn ($record) => $activeAcademicYearId && (int) $record['academic_year_id'] === $activeAcademicYearId)
                ->values()
                ->all(),
        ];
    }

    public function evaluateForm(Request $request): Response|RedirectResponse
    {
        $studentId = (int) session('client_id');
        $subjectSectionId = (int) $request->query('subject_section_id');
        $subjectId = (int) $request->query('subject_id');
        $category = $request->query('category', 'teacher_subject');
        $cycle = $this->activeCycle();

        if (! Schema::hasTable('evaluation_submissions') || ($category === 'teacher_subject' && ! Schema::hasTable('subject'))) {
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
        $submissionSubjects = $this->legacyRegisteredSubjects($student, $cycle);
        $submissionRecords = $this->studentEvaluationRecords($student, $cycle, $submissionSubjects);
        $subjectSection = null;

        if (in_array($category, ['program_chair', 'employee_evaluation'], true)) {
            if ($category === 'employee_evaluation') {
                $evaluatee = Employee::query()
                    ->where('id', (int) $request->query('evaluatee_id'))
                    ->where('branch_id', $student->branch_id)
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->first();
                $notFoundMessage = 'Employee not found in your assigned branch.';
                $missingQuestionnaireMessage = 'No questionnaire is assigned to this employee yet.';
            } else {
                $evaluatee = Teacher::query()
                    ->with(['program:id,name', 'strand:id,name', 'department:id,name'])
                    ->where('id', (int) $request->query('evaluatee_id'))
                    ->where('branch_id', $student->branch_id)
                    ->where('department_id', $student->department_id)
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->whereRaw('LOWER(COALESCE(role, "")) LIKE ?', ['%program chair%'])
                    ->first();
                $notFoundMessage = 'Program chair not found for this student.';
                $missingQuestionnaireMessage = 'No questionnaire is assigned to this program chair yet.';
            }

            if (! $evaluatee) {
                return redirect()->route('portal.student.dashboard')->with('error', $notFoundMessage);
            }

            $questionnaireId = $evaluatee->questionnaire_id ? (int) $evaluatee->questionnaire_id : null;
            $questions = $this->questionnaireQuestions($questionnaireId);

            if ($questions->isEmpty()) {
                return redirect()->route('portal.student.dashboard')->with('error', $missingQuestionnaireMessage);
            }

            $questionnaireTitle = Schema::hasTable('questionnaires')
                ? DB::table('questionnaires')
                    ->where('id', $questionnaireId)
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->value('title')
                : null;

            return Inertia::render('Student/EvaluateForm', [
                'category' => $category,
                'questionnaireId' => $questionnaireId,
                'questionnaireTitle' => $questionnaireTitle,
                'evaluatee' => [
                    'id' => $evaluatee->id,
                    'name' => $evaluatee->full_name,
                    'role' => $evaluatee->role ?? ($category === 'employee_evaluation' ? 'Employee' : 'Program Chair'),
                    'scope' => $category === 'employee_evaluation'
                        ? ''
                        : ($evaluatee->program?->name ?? $evaluatee->strand?->name ?? $evaluatee->department?->name ?? ''),
                ],
                'subjectSectionId' => null,
                'subjectId' => null,
                'subjectInfo' => null,
                'questions' => $questions,
                'submissions' => $submissionRecords['current'],
                'cycle' => [
                    'id' => $cycle->id,
                    'school_year' => $schoolYear,
                    'semester' => $this->semesterLabel($cycle->term ?? null),
                    'term' => $cycle->term,
                ],
            ]);
        }

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
                    DB::raw($this->fullNameExpression('e.') . ' as teacher_name'),
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
            'submissions' => $submissionRecords['current'],
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
            'category' => 'required|in:teacher_subject,program_chair,employee_evaluation',
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

        if (! Schema::hasTable('evaluation_submissions') || ($data['category'] === 'teacher_subject' && ! Schema::hasTable('subject'))) {
            return back()->withErrors(['message' => 'Submissions storage is not available.']);
        }

        $terms = array_values(array_unique(array_filter([
            $data['term'],
            ...$this->termOptions($data['term']),
        ])));

        $student = Student::with('yearLevel')->findOrFail($studentId);

        if ($data['category'] === 'program_chair') {
            $target = Teacher::query()
                ->where('id', (int) ($data['evaluatee_id'] ?? 0))
                ->where('branch_id', $student->branch_id)
                ->where('department_id', $student->department_id)
                ->where('is_activated', 1)
                ->where('is_deleted', 0)
                ->whereRaw('LOWER(COALESCE(role, "")) LIKE ?', ['%program chair%'])
                ->first();

            if (! $target) {
                return redirect()->route('portal.student.dashboard')
                    ->with('error', 'Program chair not found for this student.');
            }

            $questionnaireId = (int) ($target->questionnaire_id ?: ($data['questionnaire_id'] ?? 0));
            $allowedQuestionIds = $this->questionnaireQuestions($questionnaireId)
                ->pluck('question_id')
                ->map(fn ($id) => (int) $id);

            $submittedQuestionIds = collect($data['answers'])
                ->pluck('question_id')
                ->map(fn ($id) => (int) $id);

            if ($allowedQuestionIds->isEmpty()) {
                return back()->withErrors(['message' => 'No questionnaire is assigned to this program chair yet.']);
            }

            if ($submittedQuestionIds->diff($allowedQuestionIds)->isNotEmpty()) {
                return back()->withErrors(['message' => 'Submitted answers do not match the assigned questionnaire.']);
            }

            if ($this->studentHasTargetSubmission($student, (int) $data['academic_year_id'], $questionnaireId, (int) $target->id)) {
                return redirect()->route('portal.student.dashboard')
                    ->with('error', 'You have already submitted this evaluation.');
            }

            $ratings = array_column($data['answers'], 'rating');
            $avg = count($ratings) ? round(array_sum($ratings) / count($ratings), 2) : 0;

            try {
                DB::transaction(function () use ($student, $target, $data, $questionnaireId, $avg) {
                    $submissionPayload = [
                        'branch_id' => $student->branch_id,
                        'academic_year_id' => $data['academic_year_id'],
                        'questionnaire_type_id' => $this->questionnaireTypeId($questionnaireId),
                        'questionnaire_id' => $questionnaireId ?: null,
                        'subject_id' => null,
                        'teacher_id' => $target->id,
                        'answers' => json_encode($data['answers']),
                        'comments' => json_encode(! empty($data['comments']) ? ['text' => $data['comments']] : []),
                        'overall_average' => $avg,
                        'submitted_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    if (Schema::hasColumn('evaluation_submissions', 'school_year')) {
                        $submissionPayload['school_year'] = $data['school_year'];
                    }

                    if (Schema::hasColumn('evaluation_submissions', 'term')) {
                        $submissionPayload['term'] = $data['term'];
                    }

                    $submissionId = (int) DB::table('evaluation_submissions')->insertGetId($submissionPayload);

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

            return redirect()->route('portal.student.dashboard')->with('success', 'Evaluation submitted. Thank you!');
        }

        if ($data['category'] === 'employee_evaluation') {
            if (! Schema::hasColumn('evaluation_submissions', 'employee_id')) {
                return back()->withErrors(['message' => 'Employee evaluation storage is not available. Please run the latest migrations.']);
            }

            $evaluatee = Employee::query()
                ->where('id', (int) ($data['evaluatee_id'] ?? 0))
                ->where('branch_id', $student->branch_id)
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->first();

            if (! $evaluatee) {
                return redirect()->route('portal.student.dashboard')
                    ->with('error', 'Employee not found in your assigned branch.');
            }

            $questionnaireId = $evaluatee->questionnaire_id ? (int) $evaluatee->questionnaire_id : null;
            $allowedQuestionIds = $this->questionnaireQuestions($questionnaireId)
                ->pluck('question_id')
                ->map(fn ($id) => (int) $id);

            if ($allowedQuestionIds->isEmpty()) {
                return redirect()->route('portal.student.dashboard')
                    ->with('error', 'No questionnaire is assigned to this employee yet.');
            }

            $submittedQuestionIds = collect($data['answers'])
                ->pluck('question_id')
                ->map(fn ($id) => (int) $id);

            if ($submittedQuestionIds->diff($allowedQuestionIds)->isNotEmpty()) {
                return back()->withErrors(['message' => 'Submitted answers do not match the assigned questionnaire.']);
            }

            if ($this->studentHasEmployeeSubmission($student, (int) $data['academic_year_id'], $questionnaireId, (int) $evaluatee->id)) {
                return redirect()->route('portal.student.dashboard')
                    ->with('error', 'You have already submitted this employee evaluation.');
            }

            $ratings = array_column($data['answers'], 'rating');
            $avg = count($ratings) ? round(array_sum($ratings) / count($ratings), 2) : 0;
            $newItems = collect($data['answers'])
                ->groupBy('question_id')
                ->map(fn ($group) => round($group->avg('rating'), 2))
                ->toArray();

            try {
                DB::transaction(function () use ($student, $evaluatee, $data, $questionnaireId, $avg, $newItems) {
                    $submissionPayload = [
                        'branch_id' => $student->branch_id,
                        'academic_year_id' => $data['academic_year_id'],
                        'questionnaire_type_id' => $this->questionnaireTypeId($questionnaireId),
                        'questionnaire_id' => $questionnaireId,
                        'subject_id' => null,
                        'employee_id' => $evaluatee->id,
                        'answers' => json_encode($data['answers']),
                        'comments' => json_encode(! empty($data['comments']) ? ['text' => $data['comments']] : []),
                        'overall_average' => $avg,
                        'submitted_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    if (Schema::hasColumn('evaluation_submissions', 'school_year')) {
                        $submissionPayload['school_year'] = $data['school_year'];
                    }

                    if (Schema::hasColumn('evaluation_submissions', 'term')) {
                        $submissionPayload['term'] = $data['term'];
                    }

                    $submissionId = (int) DB::table('evaluation_submissions')->insertGetId($submissionPayload);

                    $submissionIds = collect($student->evaluation_submission_ids ?? [])
                        ->map(fn ($id) => (int) $id)
                        ->push($submissionId)
                        ->unique()
                        ->values()
                        ->all();

                    $student->forceFill([
                        'evaluation_submission_ids' => $submissionIds,
                    ])->save();

                    if (Schema::hasTable('ratings_employee')) {
                        $existing = DB::table('ratings_employee')
                            ->where('academic_year_id', $data['academic_year_id'])
                            ->where('employee_id', $evaluatee->id)
                            ->first();

                        if ($existing) {
                            $count = ((int) $existing->submission_count) + 1;
                            $previous = json_decode($existing->item_ratings ?? '{}', true) ?: [];
                            $combined = [];

                            foreach (array_unique(array_merge(array_keys($previous), array_keys($newItems))) as $questionId) {
                                $combined[$questionId] = round((($previous[$questionId] ?? 0) * ($count - 1) + ($newItems[$questionId] ?? 0)) / $count, 2);
                            }

                            $overall = count($combined) ? round(array_sum($combined) / count($combined), 2) : 0;

                            DB::table('ratings_employee')->where('id', $existing->id)->update([
                                'submission_count' => $count,
                                'item_ratings' => json_encode($combined),
                                'overall_ratings' => json_encode(['average' => $overall]),
                                'updated_at' => now(),
                            ]);
                        } else {
                            $overall = count($newItems) ? round(array_sum($newItems) / count($newItems), 2) : 0;

                            DB::table('ratings_employee')->insert([
                                'academic_year_id' => $data['academic_year_id'],
                                'employee_id' => $evaluatee->id,
                                'submission_count' => 1,
                                'item_ratings' => json_encode($newItems),
                                'overall_ratings' => json_encode(['average' => $overall]),
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }
                });
            } catch (Throwable $exception) {
                report($exception);

                return back()->withErrors(['message' => 'Evaluation could not be saved. Please try again.']);
            }

            return redirect()->route('portal.student.dashboard')->with('success', 'Employee feedback submitted. Thank you!');
        }

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
            $subjectSection->subject_id ? (int) $subjectSection->subject_id : null,
        );

        if ($already) {
            return redirect()->route('portal.student.dashboard')
                ->with('error', 'You have already submitted this evaluation.');
        }

        $ratings = array_column($data['answers'], 'rating');
        $avg = count($ratings) ? round(array_sum($ratings) / count($ratings), 2) : 0;

        try {
            DB::transaction(function () use ($student, $subjectSection, $data, $questionnaireId, $terms) {
                $questionnaireTypeId = $this->questionnaireTypeId($questionnaireId);
                $comments = $data['comments'] ?? null;
                $submissionPayload = [
                    'branch_id' => $student->branch_id,
                    'academic_year_id' => $data['academic_year_id'],
                    'questionnaire_type_id' => $questionnaireTypeId,
                    'questionnaire_id' => $questionnaireId ?: null,
                    'subject_id' => $subjectSection->subject_id,
                    'answers' => json_encode($data['answers']),
                    'comments' => json_encode($comments ? ['text' => $comments] : []),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if (Schema::hasColumn('evaluation_submissions', 'teacher_id')) {
                    $submissionPayload['teacher_id'] = $subjectSection->teacher_employee_id ?: null;
                }

                if (Schema::hasColumn('evaluation_submissions', 'school_year')) {
                    $submissionPayload['school_year'] = $data['school_year'];
                }

                if (Schema::hasColumn('evaluation_submissions', 'term')) {
                    $submissionPayload['term'] = $terms[0] ?? $data['term'];
                }

                $submissionId = (int) DB::table('evaluation_submissions')->insertGetId($submissionPayload);

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

        try {
            if (! Schema::hasTable('ratings_subject')) {
                return redirect()->route('portal.student.dashboard')->with('success', 'Evaluation submitted. Thank you!');
            }

            $ratingPersonColumn = collect(['employee_id', 'teacher_id'])
                ->first(fn (string $column) => Schema::hasColumn('ratings_subject', $column));

            if (! $ratingPersonColumn) {
                return redirect()->route('portal.student.dashboard')->with('success', 'Evaluation submitted. Thank you!');
            }

            $canAggregateRating = match ($ratingPersonColumn) {
                'employee_id' => Schema::hasTable('employee')
                    && DB::table('employee')->where('id', $subjectSection->teacher_employee_id)->exists(),
                'teacher_id' => Schema::hasTable('teacher')
                    && DB::table('teacher')->where('id', $subjectSection->teacher_employee_id)->exists(),
                default => false,
            };

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
        } catch (Throwable $exception) {
            report($exception);
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
        $programChairs = [];
        $employees = [];
        $evaluations  = [];
        $archive      = [];

        if (
            $cycle &&
            Schema::hasTable('student_enrollments') &&
            Schema::hasTable('subject_sections') &&
            Schema::hasTable('subject') &&
            Schema::hasTable('evaluation_submissions')
        ) {
            [$termA, $termB] = $this->termOptions($cycle->term ?? null);
            $schoolYear      = trim("{$cycle->from_year}-{$cycle->to_year}");
            $sectionNameSelect = Schema::hasTable('sections')
                ? 'sec.name as section_name'
                : DB::raw('NULL as section_name');

            // My subjects for current cycle (read-only — no evaluate button)
            $subjectsQuery = DB::table('student_enrollments as se')
                ->join('subject_sections as ss', 'ss.id', '=', 'se.subject_section_id')
                ->join('subject as subj', 'subj.id', '=', 'ss.subject_id')
                ->leftJoin('employee as e', 'e.id', '=', 'ss.teacher_employee_id');

            if (Schema::hasTable('sections')) {
                $subjectsQuery->leftJoin('sections as sec', 'sec.id', '=', 'ss.section_id');
            }

            $subjects = $subjectsQuery
                ->select(
                    'ss.id as section_id',
                    $sectionNameSelect,
                    'ss.school_year',
                    'ss.term',
                    'ss.schedule',
                    'ss.room',
                    'subj.id as course_id',
                    'subj.code as course_code',
                    'subj.name as course_name',
                    'subj.questionnaire_id',
                    'ss.teacher_employee_id as teacher_id',
                    DB::raw($this->fullNameExpression('e.') . ' as teacher_name'),
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
                        $row->course_id ? (int) $row->course_id : null,
                    );

                    return array_merge((array) $row, [
                        'questionnaire_id' => $questionnaireId,
                        'semester_label' => $this->semesterLabel($row->term),
                        'already_evaluated' => $alreadyEvaluated,
                        'is_irregular' => false,
                        'can_evaluate' => ! empty($questionnaireId) && ! empty($row->teacher_name),
                    ]);
                })
                ->toArray();

        }

        if (empty($subjects)) {
            $subjects = $this->legacyRegisteredSubjects($student, $cycle);
        }

        $studentEvaluationRecords = $this->studentEvaluationRecords($student, $cycle, $subjects);
        $evaluations = $studentEvaluationRecords['current'];
        $archive = $studentEvaluationRecords['archive'];

        $programChairs = $this->programChairTargets($student, $cycle);
        $submittedProgramChairForms = $this->submittedProgramChairForms($student, $programChairs, $cycle);
        $employees = $this->branchEmployeesForStudent($student, $cycle);
        $submittedEmployeeForms = $this->submittedEmployeeForms($student, $employees, $cycle);

        $evaluationForms = collect($subjects)
            ->filter(fn ($subject) => ! empty($subject['can_evaluate']) && empty($subject['already_evaluated']))
            ->mapWithKeys(function ($subject) use ($cycle) {
                $questionnaireId = (int) ($subject['questionnaire_id'] ?? 0);
                $questions = $this->questionnaireQuestions($questionnaireId);

                if (! $cycle || ! $questionnaireId || $questions->isEmpty()) {
                    return [];
                }

                $formKey = ! empty($subject['section_id'])
                    ? 'subject_section:' . $subject['section_id']
                    : 'subject:' . $subject['course_id'];

                return [$formKey => [
                    'category' => 'teacher_subject',
                    'questionnaireId' => $questionnaireId,
                    'questionnaireTypeId' => $this->questionnaireTypeId($questionnaireId),
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

        $evaluationForms = array_merge(
            $evaluationForms,
            $this->evaluationFormsForProgramChairs($programChairs, $cycle, $submittedProgramChairForms),
            $this->evaluationFormsForEmployees($employees, $cycle, $submittedEmployeeForms),
        );

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
            'programChairs' => $programChairs,
            'employees' => $employees,
            'evaluations' => $evaluations,
            'archive'     => $archive,
            'evaluationForms' => $evaluationForms,
        ]);
    }
}
