<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\DepartmentEvaluationWindow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class AssignmentController extends Controller
{
    private const TYPE_CODE_MAP = [
        'student-teacher' => 'QTYPE-SUBJECT',
        'peer' => 'QTYPE-PEER',
        'head' => 'QTYPE-HEAD',
        'employee' => 'QTYPE-EMPLOYEE',
    ];

    private function baseQuery(?string $search = '')
    {
        $search = $search ?? '';

        return DB::table('questionnaire_distribution as qd')
            ->leftJoin('questionnaires as q', 'qd.questionnaire_id', '=', 'q.id')
            ->leftJoin('questionnaire_type as qt', 'q.questionnaire_type_id', '=', 'qt.id')
            ->leftJoin('academic_year as ay', 'qd.academic_year_id', '=', 'ay.id')
            ->select(
                'qd.id as distribution_id',
                'qd.branch_id',
                'qd.code as distribution_code',
                'q.code as questionnaire_code',
                'q.title as questionnaire_title',
                'qt.name as questionnaire_type_name',
                'q.notes as questionnaire_notes',
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year"),
                'ay.term as semester',
                'qd.items',
                'qd.is_activated'
            )
            ->when($search, fn ($query) => $query->where(function ($sub) use ($search) {
                $sub->where('qd.code', 'like', "%{$search}%")
                    ->orWhere('q.code', 'like', "%{$search}%")
                    ->orWhere('q.title', 'like', "%{$search}%")
                    ->orWhere('qt.name', 'like', "%{$search}%");
            }))
            ->where('qd.is_deleted', 0);
    }

    private function renderAssignmentsPage(Request $request, string $assignmentType)
    {
        $search = (string) ($request->input('search') ?? '');
        $scopedBranchId = $this->scopedBranchId();
        $requestedBranchId = $request->integer('branch_id');
        $typeCode = self::TYPE_CODE_MAP[$assignmentType] ?? self::TYPE_CODE_MAP['student-teacher'];

        $branches = DB::table('branch')
            ->select('id', 'code', 'name')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->where('code', '!=', 'OVERALL')
            ->when($scopedBranchId, fn ($query) => $query->where('id', $scopedBranchId))
            ->orderBy('name')
            ->get();
        $branchId = $scopedBranchId
            ?? ($branches->contains('id', $requestedBranchId) ? $requestedBranchId : $branches->first()?->id);

        $assignments = $this->baseQuery($search)
            ->where('qt.code', $typeCode)
            ->when($branchId, fn ($query) => $query->where('qd.branch_id', $branchId))
            ->orderByDesc('qd.id')
            ->paginate(15)
            ->withQueryString();

        $questionnaires = DB::table('questionnaires as q')
            ->leftJoin('questionnaire_type as qt', 'q.questionnaire_type_id', '=', 'qt.id')
            ->select(
                'q.id as questionnaire_id',
                'q.code as questionnaire_code',
                'q.title',
                'q.notes',
                'q.items',
                'q.comments',
                'qt.name as questionnaire_type_name'
            )
            ->where('q.is_deleted', 0)
            ->where('qt.code', $typeCode)
            ->when($branchId, fn ($query) => $query->where(function ($sub) use ($branchId) {
                $sub->where('q.branch_id', $branchId)
                    ->orWhereNull('q.branch_id')
                    ->orWhere('q.branch_id', 1);
            }))
            ->orderBy('q.title')
            ->get();

        $questionIds = $questionnaires
            ->flatMap(function ($questionnaire) {
                $items = json_decode($questionnaire->items ?? '{}', true) ?: [];
                $comments = json_decode($questionnaire->comments ?? '[]', true) ?: [];

                $scaleQuestionIds = collect($items['scale_questions'] ?? [])
                    ->flatMap(fn ($group) => collect($group['questions'] ?? [])->map(fn ($id) => (int) $id));

                $commentSectionIds = collect(data_get($items, 'comment_section.questions', []))
                    ->map(fn ($question) => (int) data_get($question, 'question_id'))
                    ->filter();

                return $scaleQuestionIds
                    ->merge($commentSectionIds)
                    ->merge(collect($comments)->map(fn ($id) => (int) $id))
                    ->filter()
                    ->values();
            })
            ->unique()
            ->values();

        $questionMap = DB::table('question')
            ->select('id', 'description')
            ->whereIn('id', $questionIds->all())
            ->get()
            ->keyBy('id');

        $questionnaires = $questionnaires->map(function ($questionnaire) use ($questionMap) {
            $items = json_decode($questionnaire->items ?? '{}', true) ?: [];
            $comments = collect(json_decode($questionnaire->comments ?? '[]', true) ?: [])
                ->map(fn ($id) => [
                    'question_id' => (int) $id,
                    'description' => data_get($questionMap->get((int) $id), 'description'),
                ])
                ->values();

            $scaleQuestions = collect($items['scale_questions'] ?? [])
                ->map(function ($group) use ($questionMap) {
                    $questions = collect($group['questions'] ?? [])
                        ->map(fn ($id) => [
                            'question_id' => (int) $id,
                            'description' => data_get($questionMap->get((int) $id), 'description'),
                        ])
                        ->values();

                    return [
                        'class_name' => $group['class_name'] ?? '',
                        'weight_percentage' => $group['weight_percentage'] ?? null,
                        'questions' => $questions,
                    ];
                })
                ->values();

            $commentSection = collect(data_get($items, 'comment_section.questions', []))
                ->map(function ($question) use ($questionMap) {
                    $questionId = (int) data_get($question, 'question_id');

                    return [
                        'question_id' => $questionId,
                        'description' => data_get($questionMap->get($questionId), 'description'),
                    ];
                })
                ->values();

            return [
                'questionnaire_id' => $questionnaire->questionnaire_id,
                'questionnaire_code' => $questionnaire->questionnaire_code,
                'title' => $questionnaire->title,
                'notes' => $questionnaire->notes,
                'questionnaire_type_name' => $questionnaire->questionnaire_type_name,
                'scale_questions' => $scaleQuestions,
                'comment_section' => $commentSection,
                'comments_list' => $comments,
            ];
        })->values();

        $departments = DB::table('department')
            ->select('id', 'code', 'name', 'branch_id', 'is_activated')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
            ->orderBy('name')
            ->get();
        $departmentIds = $departments->pluck('id')->all();

        $employeeDepartmentTable = $this->employeeDepartmentTable();
        $employeeDepartments = $employeeDepartmentTable
            ? DB::table($employeeDepartmentTable)
                ->select('id', 'code', 'name', 'branch_id', 'is_activated')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->when($branchId, fn ($query) => $query->where(function ($sub) use ($branchId) {
                    $sub->where('branch_id', $branchId)
                        ->orWhereNull('branch_id');
                }))
                ->orderBy('name')
                ->get()
            : collect();

        $programs = DB::table('program')
            ->select('id', 'code', 'name', 'department_id', 'is_activated')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($branchId, fn ($query) => $query->whereIn('department_id', $departmentIds))
            ->orderBy('name')
            ->get();

        $strands = DB::table('strand')
            ->select('id', 'code', 'name', 'department_id', 'is_activated')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($branchId, fn ($query) => $query->whereIn('department_id', $departmentIds))
            ->orderBy('name')
            ->get();

        $yearLevels = DB::table('education_level')
            ->select('id', 'department_id', 'program_id', 'year_level', 'section', 'subject_id', 'is_activated')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($branchId, fn ($query) => $query->whereIn('department_id', $departmentIds))
            ->orderBy('year_level')
            ->orderBy('section')
            ->get();

        $subjects = DB::table('subject')
            ->select('id', 'code', 'name', 'department_id', 'program_id', 'strand_id', 'is_activated')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($branchId, fn ($query) => $query->whereIn('department_id', $departmentIds))
            ->orderBy('name')
            ->get();

        $faculty = DB::table('teacher')
            ->select(
                'id',
                'code',
                'firstname',
                'middlename',
                'lastname',
                'role',
                'branch_id',
                'department_id',
                'program_id',
                'strand_id',
                'is_activated'
            )
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->get()
            ->map(fn ($teacher) => [
                'id' => $teacher->id,
                'code' => $teacher->code,
                'name' => trim(collect([$teacher->firstname, $teacher->middlename, $teacher->lastname])->filter()->implode(' ')),
                'role' => $teacher->role,
                'branch_id' => $teacher->branch_id,
                'department_id' => $teacher->department_id,
                'program_id' => $teacher->program_id,
                'strand_id' => $teacher->strand_id,
                'is_activated' => $teacher->is_activated,
            ])
            ->values();

        $employees = Schema::hasTable('employee') && Schema::hasColumn('employee', 'employee_department_id')
            ? DB::table('employee')
                ->select(
                    'id',
                    'code',
                    'firstname',
                    'middlename',
                    'lastname',
                    'role',
                    'branch_id',
                    'employee_department_id',
                    'is_activated'
                )
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
                ->orderBy('lastname')
                ->orderBy('firstname')
                ->get()
                ->map(fn ($employee) => [
                    'id' => $employee->id,
                    'code' => $employee->code,
                    'name' => trim(collect([$employee->firstname, $employee->middlename, $employee->lastname])->filter()->implode(' ')),
                    'role' => $employee->role,
                    'branch_id' => $employee->branch_id,
                    'employee_department_id' => $employee->employee_department_id,
                    'is_activated' => $employee->is_activated,
                ])
                ->values()
            : collect();

        $selectedQuestionnaires = $this->buildSelectedQuestionnaireMap($typeCode, $branchId);
        $customSubjectGroups = $this->buildCustomSubjectGroups();

        return Inertia::render('Admin/Assignments', [
            'assignments'    => $assignments,
            'assignmentType' => $assignmentType,
            'filters'        => ['search' => $search, 'branch_id' => $branchId],
            'questionnaires' => $questionnaires,
            'branches'       => $branches,
            'departments'    => $departments,
            'employeeDepartments' => $employeeDepartments,
            'programs'       => $programs,
            'strands'        => $strands,
            'yearLevels'     => $yearLevels,
            'subjects'       => $subjects,
            'faculty'        => $faculty,
            'employees'      => $employees,
            'selectedQuestionnaires' => $selectedQuestionnaires,
            'customSubjectGroups' => $customSubjectGroups,
        ]);
    }

    private function buildCustomSubjectGroups(): array
    {
        if (!Schema::hasTable('custom_subject') || !Schema::hasColumn('custom_subject', 'questionnaire_id')) {
            return [];
        }

        return DB::table('custom_subject as cs')
            ->leftJoin('questionnaires as q', 'cs.questionnaire_id', '=', 'q.id')
            ->select(
                'cs.id',
                'cs.program_id',
                'cs.questionnaire_id',
                'cs.subject_ids',
                'q.code as questionnaire_code',
                'q.title as questionnaire_title'
            )
            ->where('cs.is_deleted', 0)
            ->get()
            ->groupBy('program_id')
            ->map(function ($rows) {
                return $rows->map(function ($row) {
                    return [
                        'id' => $row->id,
                        'program_id' => $row->program_id,
                        'questionnaire_id' => $row->questionnaire_id,
                        'questionnaire_code' => $row->questionnaire_code,
                        'questionnaire_title' => $row->questionnaire_title,
                        'subject_ids' => array_values(array_map('intval', json_decode($row->subject_ids ?? '[]', true) ?: [])),
                    ];
                })->values()->all();
            })
            ->toArray();
    }

    private function buildSelectedQuestionnaireMap(string $typeCode, ?int $branchId = null): array
    {
        $hasCustomSubjectTable = Schema::hasTable('custom_subject');
        $hasCustomSubjectQuestionnaireId = $hasCustomSubjectTable && Schema::hasColumn('custom_subject', 'questionnaire_id');

        $customSubjectRows = collect();

        if ($hasCustomSubjectTable) {
            $query = DB::table('custom_subject')
                ->select('program_id', 'subject_ids')
                ->where('is_deleted', 0);

            if ($hasCustomSubjectQuestionnaireId) {
                $query->addSelect('questionnaire_id');
            }

            $customSubjectRows = $query->get();
        }

        $customSubjectMap = [];

        foreach ($customSubjectRows as $row) {
            if (! $hasCustomSubjectQuestionnaireId) {
                continue;
            }

            $customSubjectMap[(int) $row->program_id . ':' . (int) $row->questionnaire_id] =
                array_values(array_map('intval', json_decode($row->subject_ids ?? '[]', true) ?: []));
        }

        $distributions = DB::table('questionnaire_distribution as qd')
            ->join('questionnaires as q', 'qd.questionnaire_id', '=', 'q.id')
            ->join('questionnaire_type as qt', 'q.questionnaire_type_id', '=', 'qt.id')
            ->select(
                'qd.id',
                'qd.questionnaire_id',
                'qd.items',
                'q.code as questionnaire_code',
                'q.title as questionnaire_title'
            )
            ->where('qd.is_deleted', 0)
            ->where('q.is_deleted', 0)
            ->where('qt.code', $typeCode)
            ->when($branchId, fn ($query) => $query->where(function ($sub) use ($branchId) {
                $sub->where('qd.branch_id', $branchId)
                    ->orWhereNull('qd.branch_id');
            }))
            ->get();
        $questionnaireLookup = $distributions->keyBy('questionnaire_id');

        $map = [];

        foreach ($distributions as $distribution) {
            $items = json_decode($distribution->items ?? '{}', true) ?: [];
            $customScopeGroups = collect($items['custom_scope_groups'] ?? [])
                ->map(fn ($group) => [
                    'id' => $group['id'] ?? null,
                    'questionnaire_id' => (int) ($group['questionnaire_id'] ?? 0),
                    'subject_ids' => array_values(array_map('intval', $group['subject_ids'] ?? [])),
                ])
                ->filter(fn ($group) => !empty($group['questionnaire_id']))
                ->values()
                ->all();

            if (!empty($items['department_id'])) {
                $map['department-' . (int) $items['department_id']] = [
                    'distribution_id' => $distribution->id,
                    'questionnaire_id' => $distribution->questionnaire_id,
                    'questionnaire_code' => $distribution->questionnaire_code,
                    'questionnaire_title' => $distribution->questionnaire_title,
                    'custom_subject_ids' => array_values(array_map('intval', $items['custom_subject_ids'] ?? [])),
                    'custom_scope_groups' => $customScopeGroups,
                ];

                if ($typeCode === self::TYPE_CODE_MAP['peer']) {
                    $scopeConfig = $this->peerScopeConfig((int) $items['department_id']);
                    $scopeKeyPrefix = $this->peerScopeKeyPrefix((string) ($scopeConfig['items_key'] ?? ''));
                    $scopeIds = collect($items[$scopeConfig['items_key'] ?? ''] ?? [])
                        ->map(fn ($id) => (int) $id)
                        ->filter()
                        ->values()
                        ->all();

                    if ($scopeKeyPrefix) {
                        if (!empty($customScopeGroups)) {
                            foreach ($customScopeGroups as $group) {
                                $groupQuestionnaire = $questionnaireLookup->get((int) $group['questionnaire_id']);

                                foreach (($group['subject_ids'] ?? []) as $peerScopeId) {
                                    $map[$scopeKeyPrefix . '-' . (int) $peerScopeId] = [
                                        'distribution_id' => $distribution->id,
                                        'questionnaire_id' => (int) $group['questionnaire_id'],
                                        'questionnaire_code' => $groupQuestionnaire->questionnaire_code ?? $distribution->questionnaire_code,
                                        'questionnaire_title' => $groupQuestionnaire->questionnaire_title ?? $distribution->questionnaire_title,
                                        'custom_subject_ids' => array_values(array_map('intval', $group['subject_ids'] ?? [])),
                                        'custom_scope_groups' => $customScopeGroups,
                                    ];
                                }
                            }
                        } else {
                            foreach ($scopeIds as $peerScopeId) {
                                $map[$scopeKeyPrefix . '-' . $peerScopeId] = [
                                    'distribution_id' => $distribution->id,
                                    'questionnaire_id' => $distribution->questionnaire_id,
                                    'questionnaire_code' => $distribution->questionnaire_code,
                                    'questionnaire_title' => $distribution->questionnaire_title,
                                    'custom_subject_ids' => $scopeIds,
                                    'custom_scope_groups' => [],
                                ];
                            }
                        }
                    }
                }
            }

            foreach (($items['program_ids'] ?? []) as $programId) {
                $map['program-' . (int) $programId] = [
                    'distribution_id' => $distribution->id,
                    'questionnaire_id' => $distribution->questionnaire_id,
                    'questionnaire_code' => $distribution->questionnaire_code,
                    'questionnaire_title' => $distribution->questionnaire_title,
                    'custom_subject_ids' => $customSubjectMap[(int) $programId . ':' . (int) $distribution->questionnaire_id]
                        ?? array_values(array_map('intval', $items['custom_subject_ids'] ?? [])),
                    'custom_scope_groups' => $customScopeGroups,
                ];
            }

            foreach (($items['strand_ids'] ?? []) as $strandId) {
                $map['strand-' . (int) $strandId] = [
                    'distribution_id' => $distribution->id,
                    'questionnaire_id' => $distribution->questionnaire_id,
                    'questionnaire_code' => $distribution->questionnaire_code,
                    'questionnaire_title' => $distribution->questionnaire_title,
                    'custom_subject_ids' => array_values(array_map('intval', $items['custom_subject_ids'] ?? [])),
                    'custom_scope_groups' => $customScopeGroups,
                ];
            }

            foreach (($items['year_level_ids'] ?? []) as $yearLevelId) {
                $map['level-' . (int) $yearLevelId] = [
                    'distribution_id' => $distribution->id,
                    'questionnaire_id' => $distribution->questionnaire_id,
                    'questionnaire_code' => $distribution->questionnaire_code,
                    'questionnaire_title' => $distribution->questionnaire_title,
                    'custom_subject_ids' => array_values(array_map('intval', $items['custom_subject_ids'] ?? [])),
                    'custom_scope_groups' => $customScopeGroups,
                ];
            }

            if (!empty($items['teacher_id'])) {
                $map['teacher-' . (int) $items['teacher_id']] = [
                    'distribution_id' => $distribution->id,
                    'questionnaire_id' => $distribution->questionnaire_id,
                    'questionnaire_code' => $distribution->questionnaire_code,
                    'questionnaire_title' => $distribution->questionnaire_title,
                    'custom_subject_ids' => array_values(array_map('intval', $items['custom_subject_ids'] ?? [])),
                ];
            }

            if (!empty($items['employee_department_id'])) {
                $map['employee-department-' . (int) $items['employee_department_id']] = [
                    'distribution_id' => $distribution->id,
                    'questionnaire_id' => $distribution->questionnaire_id,
                    'questionnaire_code' => $distribution->questionnaire_code,
                    'questionnaire_title' => $distribution->questionnaire_title,
                    'custom_subject_ids' => array_values(array_map('intval', $items['custom_subject_ids'] ?? [])),
                ];
            }
        }

        return $map;
    }

    private function findExistingDistributionId(string $typeCode, string $scopeType, int $scopeId): ?int
    {
        $equivalentYearLevelIds = $scopeType === 'level'
            ? $this->getEquivalentYearLevelIds($scopeId)
            : [];

        $distributions = DB::table('questionnaire_distribution as qd')
            ->join('questionnaires as q', 'qd.questionnaire_id', '=', 'q.id')
            ->join('questionnaire_type as qt', 'q.questionnaire_type_id', '=', 'qt.id')
            ->select('qd.id', 'qd.items')
            ->where('qd.is_deleted', 0)
            ->where('q.is_deleted', 0)
            ->where('qt.code', $typeCode)
            ->get();

        foreach ($distributions as $distribution) {
            $items = json_decode($distribution->items ?? '{}', true) ?: [];

            if ($scopeType === 'department' && (int) ($items['department_id'] ?? 0) === $scopeId) {
                return (int) $distribution->id;
            }

            if ($scopeType === 'program' && in_array($scopeId, array_map('intval', $items['program_ids'] ?? []), true)) {
                return (int) $distribution->id;
            }

            if ($scopeType === 'strand' && in_array($scopeId, array_map('intval', $items['strand_ids'] ?? []), true)) {
                return (int) $distribution->id;
            }

            if (
                $scopeType === 'level'
                && !empty(array_intersect($equivalentYearLevelIds, array_map('intval', $items['year_level_ids'] ?? [])))
            ) {
                return (int) $distribution->id;
            }

            if ($scopeType === 'teacher' && (int) ($items['teacher_id'] ?? 0) === $scopeId) {
                return (int) $distribution->id;
            }

            if ($scopeType === 'employee-department' && (int) ($items['employee_department_id'] ?? 0) === $scopeId) {
                return (int) $distribution->id;
            }
        }

        return null;
    }

    private function validateDistributionScope(Request $request): array
    {
        $employeeDepartmentTable = $this->employeeDepartmentTable() ?? 'employee_department';

        return $request->validate([
            'branch_id'        => 'nullable|integer|exists:branch,id',
            'department_id'    => 'nullable|integer|exists:department,id',
            'program_ids'      => 'nullable|array',
            'program_ids.*'    => 'integer|exists:program,id',
            'strand_ids'       => 'nullable|array',
            'strand_ids.*'     => 'integer|exists:strand,id',
            'year_level_ids'   => 'nullable|array',
            'year_level_ids.*' => 'integer|exists:education_level,id',
            'teacher_id'       => 'nullable|integer|exists:teacher,id',
            'employee_department_id' => "nullable|integer|exists:{$employeeDepartmentTable},id",
        ]);
    }

    private function employeeDepartmentTable(): ?string
    {
        if (Schema::hasTable('employee_departments')) {
            return 'employee_departments';
        }

        if (Schema::hasTable('employee_department')) {
            return 'employee_department';
        }

        return null;
    }

    private function buildDistributionItems(array $validated): string
    {
        $yearLevelIds = collect($validated['year_level_ids'] ?? [])
            ->flatMap(fn ($id) => $this->getEquivalentYearLevelIds((int) $id))
            ->unique()
            ->values()
            ->all();

        return json_encode([
            'branch_id' => $validated['branch_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'program_ids' => array_values(array_map('intval', $validated['program_ids'] ?? [])),
            'strand_ids' => array_values(array_map('intval', $validated['strand_ids'] ?? [])),
            'year_level_ids' => $yearLevelIds,
            'teacher_id' => $validated['teacher_id'] ?? null,
            'employee_department_id' => $validated['employee_department_id'] ?? null,
        ]);
    }

    private function activeAcademicYearId(): ?int
    {
        return DB::table('academic_year')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderByDesc('from_year')
            ->orderByDesc('id')
            ->value('id');
    }

    private function departmentIdFromDistributionScope(array $scope): ?int
    {
        if (! empty($scope['department_id'])) {
            return (int) $scope['department_id'];
        }

        if (! empty($scope['program_ids'])) {
            return DB::table('program')->whereIn('id', $scope['program_ids'])->value('department_id');
        }

        if (! empty($scope['strand_ids'])) {
            return DB::table('strand')->whereIn('id', $scope['strand_ids'])->value('department_id');
        }

        if (! empty($scope['year_level_ids'])) {
            return DB::table('education_level')->whereIn('id', $scope['year_level_ids'])->value('department_id');
        }

        if (! empty($scope['teacher_id'])) {
            return DB::table('teacher')->where('id', $scope['teacher_id'])->value('department_id');
        }

        return null;
    }

    private function departmentIdForScope(string $scopeType, int $scopeId, ?int $fallbackDepartmentId = null): ?int
    {
        return match ($scopeType) {
            'department' => $scopeId,
            'program' => DB::table('program')->where('id', $scopeId)->value('department_id'),
            'strand' => DB::table('strand')->where('id', $scopeId)->value('department_id'),
            'level' => DB::table('education_level')->where('id', $scopeId)->value('department_id'),
            'teacher' => DB::table('teacher')->where('id', $scopeId)->value('department_id'),
            default => $fallbackDepartmentId,
        };
    }

    private function blockIfDepartmentEvaluationStarted(?int $departmentId, ?int $academicYearId = null): ?\Illuminate\Http\RedirectResponse
    {
        $academicYearId ??= $this->activeAcademicYearId();

        if (DepartmentEvaluationWindow::hasStarted($departmentId, $academicYearId)) {
            return back()->with('error', 'Questionnaire distribution is locked because evaluation has already started for this department.');
        }

        return null;
    }

    private function getEquivalentYearLevelIds(int $yearLevelId): array
    {
        $yearLevel = DB::table('education_level')
            ->select('department_id', 'year_level')
            ->where('id', $yearLevelId)
            ->where('is_deleted', 0)
            ->first();

        if (! $yearLevel) {
            return [$yearLevelId];
        }

        return DB::table('education_level')
            ->where('department_id', $yearLevel->department_id)
            ->where('year_level', $yearLevel->year_level)
            ->where('is_deleted', 0)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    private function getDepartmentKind(object $department): string
    {
        $name = strtolower((string) ($department->name ?? ''));
        $code = strtolower((string) ($department->code ?? ''));

        if (str_contains($name, 'college') || str_contains($code, 'col')) {
            return 'college';
        }

        if (str_contains($name, 'senior high') || str_contains($code, 'shs')) {
            return 'senior-high';
        }

        if (str_contains($name, 'junior high') || str_contains($code, 'jhs')) {
            return 'junior-high';
        }

        if (str_contains($name, 'elementary') || str_contains($name, 'grade school') || str_contains($code, 'elem')) {
            return 'elementary';
        }

        return 'other';
    }

    private function peerScopeConfig(int $departmentId): ?array
    {
        $department = DB::table('department')
            ->select('id', 'code', 'name')
            ->where('id', $departmentId)
            ->where('is_deleted', 0)
            ->first();

        if (! $department) {
            return null;
        }

        return match ($this->getDepartmentKind($department)) {
            'college' => ['table' => 'program', 'items_key' => 'program_ids', 'label' => 'programs'],
            'senior-high' => ['table' => 'strand', 'items_key' => 'strand_ids', 'label' => 'strands'],
            'junior-high', 'elementary' => ['table' => 'education_level', 'items_key' => 'year_level_ids', 'label' => 'grade levels'],
            default => null,
        };
    }

    private function peerScopeIdsForDepartment(int $departmentId): array
    {
        $scopeConfig = $this->peerScopeConfig($departmentId);

        if (! $scopeConfig) {
            return [];
        }

        if ($scopeConfig['table'] === 'education_level') {
            return DB::table('education_level')
                ->select('id', 'year_level', 'section')
                ->where('department_id', $departmentId)
                ->where('is_deleted', 0)
                ->orderByRaw('CAST(year_level AS UNSIGNED) asc')
                ->orderBy('section')
                ->orderBy('id')
                ->get()
                ->groupBy(fn ($level) => trim((string) $level->year_level))
                ->map(fn ($levels) => (int) optional($levels->first())->id)
                ->filter()
                ->values()
                ->all();
        }

        return DB::table($scopeConfig['table'])
            ->where('department_id', $departmentId)
            ->where('is_deleted', 0)
            ->orderBy('name')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    private function peerScopeKeyPrefix(string $itemsKey): ?string
    {
        return match ($itemsKey) {
            'program_ids' => 'program',
            'strand_ids' => 'strand',
            'year_level_ids' => 'level',
            default => null,
        };
    }

    private function subjectIdsForDistributionScope(string $scopeType, int $scopeId): array
    {
        if (! Schema::hasTable('subject')) {
            return [];
        }

        $subjectIds = collect();

        if ($scopeType === 'department') {
            $subjectIds = $subjectIds->merge(
                DB::table('subject')
                    ->where('department_id', $scopeId)
                    ->where('is_deleted', 0)
                    ->pluck('id')
            );
        }

        if ($scopeType === 'program') {
            $subjectIds = $subjectIds->merge(
                DB::table('subject')
                    ->where('program_id', $scopeId)
                    ->where('is_deleted', 0)
                    ->pluck('id')
            );

            $subjectIds = $subjectIds->merge(
                DB::table('education_level')
                    ->where('program_id', $scopeId)
                    ->where('is_deleted', 0)
                    ->pluck('subject_id')
                    ->flatMap(fn ($ids) => json_decode($ids ?? '[]', true) ?: [])
            );
        }

        if ($scopeType === 'strand') {
            $subjectIds = $subjectIds->merge(
                DB::table('subject')
                    ->where('strand_id', $scopeId)
                    ->where('is_deleted', 0)
                    ->pluck('id')
            );

            $subjectIds = $subjectIds->merge(
                DB::table('education_level')
                    ->where('strand_id', $scopeId)
                    ->where('is_deleted', 0)
                    ->pluck('subject_id')
                    ->flatMap(fn ($ids) => json_decode($ids ?? '[]', true) ?: [])
            );
        }

        if ($scopeType === 'level') {
            $subjectIds = $subjectIds->merge(
                DB::table('education_level')
                    ->whereIn('id', $this->getEquivalentYearLevelIds($scopeId))
                    ->where('is_deleted', 0)
                    ->pluck('subject_id')
                    ->flatMap(fn ($ids) => json_decode($ids ?? '[]', true) ?: [])
            );
        }

        return $subjectIds
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function applyQuestionnaireToScopedSubjects(string $assignmentType, string $scopeType, int $scopeId, int $questionnaireId): int
    {
        if (
            $assignmentType !== 'student-teacher'
            || ! Schema::hasTable('subject')
            || ! Schema::hasColumn('subject', 'questionnaire_id')
        ) {
            return 0;
        }

        $subjectIds = $this->subjectIdsForDistributionScope($scopeType, $scopeId);

        if (empty($subjectIds)) {
            return 0;
        }

        return DB::table('subject')
            ->whereIn('id', $subjectIds)
            ->where('is_deleted', 0)
            ->update([
                'questionnaire_id' => $questionnaireId,
                'updated_at' => now(),
            ]);
    }

    private function applyQuestionnaireToSubjectIds(array $subjectIds, int $questionnaireId): int
    {
        $subjectIds = collect($subjectIds)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if (
            empty($subjectIds)
            || $questionnaireId <= 0
            || ! Schema::hasTable('subject')
            || ! Schema::hasColumn('subject', 'questionnaire_id')
        ) {
            return 0;
        }

        return DB::table('subject')
            ->whereIn('id', $subjectIds)
            ->where('is_deleted', 0)
            ->update([
                'questionnaire_id' => $questionnaireId,
                'updated_at' => now(),
            ]);
    }

    private function updateTeacherQuestionnaireIds(array $teacherIds, ?int $questionnaireId): int
    {
        $teacherIds = collect($teacherIds)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if (
            empty($teacherIds)
            || ! Schema::hasTable('teacher')
            || ! Schema::hasColumn('teacher', 'questionnaire_id')
        ) {
            return 0;
        }

        return DB::table('teacher')
            ->whereIn('id', $teacherIds)
            ->where('is_deleted', 0)
            ->update([
                'questionnaire_id' => $questionnaireId,
                'updated_at' => now(),
            ]);
    }

    private function filterOutProgramChairTeacherIds(array $teacherIds): array
    {
        $teacherIds = collect($teacherIds)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if (empty($teacherIds) || ! Schema::hasTable('teacher')) {
            return $teacherIds;
        }

        return DB::table('teacher')
            ->whereIn('id', $teacherIds)
            ->where('is_deleted', 0)
            ->where(function ($query) {
                $query->whereNull('role')
                    ->orWhereRaw('LOWER(role) NOT LIKE ?', ['%program chair%']);
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    private function teacherIdsForScope(string $scopeType, int $scopeId): array
    {
        if (! Schema::hasTable('teacher')) {
            return [];
        }

        if ($scopeType === 'teacher') {
            return DB::table('teacher')
                ->where('id', $scopeId)
                ->where('is_deleted', 0)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        if ($scopeType === 'department') {
            return DB::table('teacher')
                ->where('department_id', $scopeId)
                ->where('is_deleted', 0)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        if ($scopeType === 'program') {
            return DB::table('teacher')
                ->where('program_id', $scopeId)
                ->where('is_deleted', 0)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        if ($scopeType === 'strand') {
            return DB::table('teacher')
                ->where('strand_id', $scopeId)
                ->where('is_deleted', 0)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        if ($scopeType === 'level' && Schema::hasTable('education_level')) {
            return DB::table('education_level')
                ->whereIn('id', $this->getEquivalentYearLevelIds($scopeId))
                ->where('is_deleted', 0)
                ->pluck('teacher_id')
                ->flatMap(fn ($ids) => json_decode($ids ?? '[]', true) ?: [])
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();
        }

        return [];
    }

    private function applyQuestionnaireToScopedTeachers(string $scopeType, int $scopeId, int $questionnaireId, bool $excludeProgramChairs = false): int
    {
        if ($questionnaireId <= 0) {
            return 0;
        }

        $teacherIds = $this->teacherIdsForScope($scopeType, $scopeId);

        if ($excludeProgramChairs) {
            $teacherIds = $this->filterOutProgramChairTeacherIds($teacherIds);
        }

        return $this->updateTeacherQuestionnaireIds(
            $teacherIds,
            $questionnaireId,
        );
    }

    private function applyQuestionnaireToScopedEmployees(int $employeeDepartmentId, int $questionnaireId, ?int $branchId = null): int
    {
        if (
            $employeeDepartmentId <= 0
            || $questionnaireId <= 0
            || ! Schema::hasTable('employee')
            || ! Schema::hasColumn('employee', 'employee_department_id')
            || ! Schema::hasColumn('employee', 'questionnaire_id')
        ) {
            return 0;
        }

        return DB::table('employee')
            ->where('employee_department_id', $employeeDepartmentId)
            ->where('is_deleted', 0)
            ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
            ->update([
                'questionnaire_id' => $questionnaireId,
                'updated_at' => now(),
            ]);
    }

    private function syncPeerTeacherQuestionnaires(int $departmentId, array $items, ?int $fallbackQuestionnaireId = null): int
    {
        $scopeConfig = $this->peerScopeConfig($departmentId);

        if (! $scopeConfig) {
            return 0;
        }

        $updated = 0;
        $departmentTeacherIds = $this->filterOutProgramChairTeacherIds(
            $this->teacherIdsForScope('department', $departmentId)
        );
        $updated += $this->updateTeacherQuestionnaireIds($departmentTeacherIds, null);

        $scopeType = $this->peerScopeKeyPrefix($scopeConfig['items_key']);
        $customGroups = collect($items['custom_scope_groups'] ?? [])
            ->filter(fn ($group) => !empty($group['questionnaire_id']))
            ->values();

        if ($customGroups->isNotEmpty() && $scopeType) {
            foreach ($customGroups as $group) {
                foreach (($group['subject_ids'] ?? []) as $peerScopeId) {
                    $updated += $this->applyQuestionnaireToScopedTeachers(
                        $scopeType,
                        (int) $peerScopeId,
                        (int) $group['questionnaire_id'],
                        true,
                    );
                }
            }

            return $updated;
        }

        $questionnaireId = (int) ($fallbackQuestionnaireId ?? 0);

        if ($questionnaireId <= 0) {
            return $updated;
        }

        $updated += $this->applyQuestionnaireToScopedTeachers('department', $departmentId, $questionnaireId, true);

        return $updated;
    }

    public function index(Request $request)
    {
        return $this->renderAssignmentsPage($request, 'student-teacher');
    }

    public function subjectAssignments(Request $request)
    {
        return $this->renderAssignmentsPage($request, 'student-teacher');
    }

    public function peerAssignments(Request $request)
    {
        return $this->renderAssignmentsPage($request, 'peer');
    }

    public function headAssignments(Request $request)
    {
        return $this->renderAssignmentsPage($request, 'head');
    }

    public function employeeAssignments(Request $request)
    {
        return $this->renderAssignmentsPage($request, 'employee');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'questionnaire_id'  => 'required|integer',
            'academic_year_id'  => 'nullable|integer',
        ]);
        $scope = $this->validateDistributionScope($request);

        if ($response = $this->blockIfDepartmentEvaluationStarted(
            $this->departmentIdFromDistributionScope($scope),
            $validated['academic_year_id'] ?? null,
        )) {
            return $response;
        }

        $count = DB::table('questionnaire_distribution')->count() + 1;

        DB::table('questionnaire_distribution')->insert([
            'branch_id'        => $scope['branch_id'] ?? null,
            'code'             => 'QD-' . str_pad($count, 3, '0', STR_PAD_LEFT),
            'questionnaire_id' => $validated['questionnaire_id'],
            'academic_year_id' => $validated['academic_year_id'] ?? null,
            'items'            => $this->buildDistributionItems($scope),
            'is_activated'     => 1,
            'is_deleted'       => 0,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        return back()->with('success', 'Assignment created.');
    }

    public function update(Request $request, int $id)
    {
        $validated = $this->validateDistributionScope($request);
        $distribution = DB::table('questionnaire_distribution')->where('id', $id)->first();

        if ($response = $this->blockIfDepartmentEvaluationStarted(
            $this->departmentIdFromDistributionScope($validated),
            $distribution?->academic_year_id ? (int) $distribution->academic_year_id : null,
        )) {
            return $response;
        }

        DB::table('questionnaire_distribution')
            ->where('id', $id)
            ->where('is_deleted', 0)
            ->update([
                'branch_id' => $validated['branch_id'] ?? null,
                'items' => $this->buildDistributionItems($validated),
                'updated_at' => now(),
            ]);

        return back()->with('success', 'Distribution scope updated.');
    }

    public function assignQuestionnaire(Request $request)
    {
        $validated = $request->validate([
            'assignment_type' => 'required|string|in:student-teacher,peer,head,employee',
            'questionnaire_id' => 'required|integer|exists:questionnaires,id',
            'scope_type' => 'required|string|in:department,program,strand,level,teacher,employee-department',
            'scope_id' => 'required|integer',
            'branch_id' => 'nullable|integer|exists:branch,id',
            'department_id' => 'nullable|integer|exists:department,id',
        ]);

        $typeCode = self::TYPE_CODE_MAP[$validated['assignment_type']] ?? self::TYPE_CODE_MAP['student-teacher'];
        $scopeId = (int) $validated['scope_id'];
        $departmentId = $this->departmentIdForScope(
            $validated['scope_type'],
            $scopeId,
            !empty($validated['department_id']) ? (int) $validated['department_id'] : null,
        );

        if ($response = $this->blockIfDepartmentEvaluationStarted($departmentId)) {
            return $response;
        }

        $yearLevelIds = $validated['scope_type'] === 'level'
            ? $this->getEquivalentYearLevelIds($scopeId)
            : [];
        $existingId = $this->findExistingDistributionId($typeCode, $validated['scope_type'], $scopeId);

        $items = [
            'branch_id' => $validated['branch_id'] ?? null,
            'department_id' => $validated['scope_type'] === 'department'
                ? (int) $validated['scope_id']
                : ($validated['department_id'] ?? null),
            'program_ids' => $validated['scope_type'] === 'program' ? [$scopeId] : [],
            'strand_ids' => $validated['scope_type'] === 'strand' ? [$scopeId] : [],
            'year_level_ids' => $yearLevelIds,
            'teacher_id' => $validated['scope_type'] === 'teacher' ? $scopeId : null,
            'employee_department_id' => $validated['scope_type'] === 'employee-department' ? $scopeId : null,
            'custom_subject_ids' => [],
        ];

        if ($validated['assignment_type'] === 'peer' && $validated['scope_type'] === 'department') {
            $scopeConfig = $this->peerScopeConfig($scopeId);
            $peerScopeIds = $this->peerScopeIdsForDepartment($scopeId);

            if ($scopeConfig) {
                $items[$scopeConfig['items_key']] = $peerScopeIds;
                $items['custom_subject_ids'] = $peerScopeIds;
            }
        }

        if ($existingId) {
            DB::table('questionnaire_distribution')
                ->where('id', $existingId)
                ->update([
                    'branch_id' => $validated['branch_id'] ?? null,
                    'questionnaire_id' => $validated['questionnaire_id'],
                    'items' => json_encode($items),
                    'updated_at' => now(),
                ]);
        } else {
            $count = DB::table('questionnaire_distribution')->count() + 1;

            DB::table('questionnaire_distribution')->insert([
                'branch_id' => $validated['branch_id'] ?? null,
                'code' => 'QD-' . str_pad($count, 3, '0', STR_PAD_LEFT),
                'questionnaire_id' => $validated['questionnaire_id'],
                'academic_year_id' => null,
                'items' => json_encode($items),
                'is_activated' => 1,
                'is_deleted' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (
            $validated['assignment_type'] === 'student-teacher'
            && $validated['scope_type'] === 'program'
            && Schema::hasTable('custom_subject')
        ) {
            DB::table('custom_subject')
                ->where('program_id', (int) $validated['scope_id'])
                ->where('is_deleted', 0)
                ->update([
                    'is_deleted' => 1,
                    'updated_at' => now(),
                ]);
        }

        $updatedSubjects = $this->applyQuestionnaireToScopedSubjects(
            $validated['assignment_type'],
            $validated['scope_type'],
            $scopeId,
            (int) $validated['questionnaire_id'],
        );

        if ($validated['assignment_type'] === 'peer' && $validated['scope_type'] === 'department') {
            $this->syncPeerTeacherQuestionnaires(
                $scopeId,
                $items,
                (int) $validated['questionnaire_id'],
            );
        }

        if ($validated['assignment_type'] === 'head' && $validated['scope_type'] === 'teacher') {
            $this->applyQuestionnaireToScopedTeachers(
                'teacher',
                $scopeId,
                (int) $validated['questionnaire_id'],
            );
        }

        $updatedEmployees = 0;

        if ($validated['assignment_type'] === 'employee' && $validated['scope_type'] === 'employee-department') {
            $updatedEmployees = $this->applyQuestionnaireToScopedEmployees(
                $scopeId,
                (int) $validated['questionnaire_id'],
                !empty($validated['branch_id']) ? (int) $validated['branch_id'] : null,
            );
        }

        $message = match ($validated['assignment_type']) {
            'student-teacher' => 'Questionnaire selected and applied to ' . $updatedSubjects . ' scoped subject' . ($updatedSubjects === 1 ? '.' : 's.'),
            'employee' => 'Questionnaire selected and applied to ' . $updatedEmployees . ' scoped employee' . ($updatedEmployees === 1 ? '.' : 's.'),
            default => 'Questionnaire selected.',
        };

        return back()->with('success', $message);
    }

    public function updateCustomSubjects(Request $request)
    {
        $validated = $request->validate([
            'assignment_type' => 'required|string|in:student-teacher,peer,head,employee',
            'scope_type' => 'required|string|in:department,program,strand,level',
            'scope_id' => 'required|integer',
            'branch_id' => 'nullable|integer|exists:branch,id',
            'department_id' => 'nullable|integer|exists:department,id',
            'questionnaire_id' => 'nullable|integer|exists:questionnaires,id',
            'groups' => 'nullable|array',
            'groups.*.questionnaire_id' => 'required_with:groups|integer|exists:questionnaires,id',
            'groups.*.subject_ids' => 'nullable|array',
            'subject_ids' => 'nullable|array',
        ]);

        if ($validated['assignment_type'] === 'peer' && $validated['scope_type'] !== 'department') {
            return back()->with('error', 'Peer custom distribution is only available by department.');
        }

        $departmentId = $this->departmentIdForScope(
            $validated['scope_type'],
            (int) $validated['scope_id'],
            !empty($validated['department_id']) ? (int) $validated['department_id'] : null,
        );

        if ($response = $this->blockIfDepartmentEvaluationStarted($departmentId)) {
            return $response;
        }

        $selectedIds = collect($validated['subject_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->values();
        $groupSelectedIds = collect($validated['groups'] ?? [])
            ->flatMap(fn ($group) => $group['subject_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->values();
        $allSelectedIds = $selectedIds->merge($groupSelectedIds)->unique()->values();

        if ($allSelectedIds->isNotEmpty()) {
            if ($validated['assignment_type'] === 'peer') {
                $scopeConfig = $this->peerScopeConfig((int) $validated['scope_id']);

                if (! $scopeConfig) {
                    return back()->with('error', 'Peer custom distribution is not available for this department.');
                }

                $validSelectedCount = DB::table($scopeConfig['table'])
                    ->whereIn('id', $allSelectedIds->all())
                    ->where('department_id', (int) $validated['scope_id'])
                    ->where('is_deleted', 0)
                    ->count();
            } else {
                $validSelectedCount = DB::table('subject')
                    ->whereIn('id', $allSelectedIds->all())
                    ->where('is_deleted', 0)
                    ->count();
            }

            if ($validSelectedCount !== $allSelectedIds->count()) {
                return back()->with('error', $validated['assignment_type'] === 'peer'
                    ? 'Selected peer scopes must be active records in this department.'
                    : 'Selected subjects must be active subject records.');
            }
        }

        $typeCode = self::TYPE_CODE_MAP[$validated['assignment_type']] ?? self::TYPE_CODE_MAP['student-teacher'];
        $existingId = $this->findExistingDistributionId($typeCode, $validated['scope_type'], (int) $validated['scope_id']);
        $firstCustomQuestionnaireId = (int) collect($validated['groups'] ?? [])
            ->pluck('questionnaire_id')
            ->filter()
            ->first();

        if (! $firstCustomQuestionnaireId && !empty($validated['questionnaire_id'])) {
            $firstCustomQuestionnaireId = (int) $validated['questionnaire_id'];
        }

        if (! $existingId) {
            if (! $firstCustomQuestionnaireId) {
                return back()->with('error', $validated['assignment_type'] === 'peer'
                    ? 'Select a questionnaire first before saving custom peer scopes.'
                    : 'Select a questionnaire first before saving custom subjects.');
            }

            $branchId = $validated['branch_id'] ?? null;
            $departmentId = $validated['department_id'] ?? null;
            $yearLevelIds = $validated['scope_type'] === 'level'
                ? $this->getEquivalentYearLevelIds((int) $validated['scope_id'])
                : [];

            if ($validated['scope_type'] === 'department') {
                $department = DB::table('department')
                    ->select('id', 'branch_id')
                    ->where('id', (int) $validated['scope_id'])
                    ->where('is_deleted', 0)
                    ->first();

                $branchId = $branchId ?? $department?->branch_id ?? null;
                $departmentId = $department?->id ?? $departmentId;
            } elseif (!$branchId || !$departmentId) {
                if ($validated['scope_type'] === 'program') {
                    $program = DB::table('program')
                        ->join('department', 'program.department_id', '=', 'department.id')
                        ->select('program.department_id', 'department.branch_id')
                        ->where('program.id', (int) $validated['scope_id'])
                        ->where('program.is_deleted', 0)
                        ->where('department.is_deleted', 0)
                        ->first();

                    $branchId = $branchId ?? $program?->branch_id ?? null;
                    $departmentId = $departmentId ?? $program?->department_id ?? null;
                } elseif ($validated['scope_type'] === 'strand') {
                    $strand = DB::table('strand')
                        ->join('department', 'strand.department_id', '=', 'department.id')
                        ->select('strand.department_id', 'department.branch_id')
                        ->where('strand.id', (int) $validated['scope_id'])
                        ->where('strand.is_deleted', 0)
                        ->where('department.is_deleted', 0)
                        ->first();

                    $branchId = $branchId ?? $strand?->branch_id ?? null;
                    $departmentId = $departmentId ?? $strand?->department_id ?? null;
                } elseif ($validated['scope_type'] === 'level') {
                    $level = DB::table('education_level')
                        ->join('department', 'education_level.department_id', '=', 'department.id')
                        ->select('education_level.department_id', 'department.branch_id')
                        ->where('education_level.id', (int) $validated['scope_id'])
                        ->where('education_level.is_deleted', 0)
                        ->where('department.is_deleted', 0)
                        ->first();

                    $branchId = $branchId ?? $level?->branch_id ?? null;
                    $departmentId = $departmentId ?? $level?->department_id ?? null;
                }
            }

            $count = DB::table('questionnaire_distribution')->count() + 1;

            $existingId = DB::table('questionnaire_distribution')->insertGetId([
                'branch_id' => $branchId,
                'code' => 'QD-' . str_pad($count, 3, '0', STR_PAD_LEFT),
                'questionnaire_id' => $firstCustomQuestionnaireId,
                'academic_year_id' => null,
                'items' => json_encode([
                    'branch_id' => $branchId,
                    'department_id' => $validated['scope_type'] === 'department'
                        ? (int) $validated['scope_id']
                        : $departmentId,
                    'program_ids' => $validated['scope_type'] === 'program' ? [(int) $validated['scope_id']] : [],
                    'strand_ids' => $validated['scope_type'] === 'strand' ? [(int) $validated['scope_id']] : [],
                    'year_level_ids' => $yearLevelIds,
                    'custom_subject_ids' => [],
                    'custom_scope_groups' => [],
                ]),
                'is_activated' => 1,
                'is_deleted' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $distribution = DB::table('questionnaire_distribution')->where('id', $existingId)->first();
        $items = json_decode($distribution->items ?? '{}', true) ?: [];

        if ($validated['assignment_type'] === 'peer') {
            $scopeConfig = $this->peerScopeConfig((int) $validated['scope_id']);

            if (! $scopeConfig) {
                return back()->with('error', 'Peer custom distribution is not available for this department.');
            }

            $peerGroups = collect($validated['groups'] ?? [])
                ->filter(fn ($group) => !empty($group['questionnaire_id']))
                ->map(fn ($group, $index) => [
                    'id' => 'peer-' . ((int) $validated['scope_id']) . '-' . $index,
                    'questionnaire_id' => (int) $group['questionnaire_id'],
                    'subject_ids' => array_values(array_map('intval', $group['subject_ids'] ?? [])),
                ])
                ->values()
                ->all();
            $peerSelectedIds = !empty($peerGroups)
                ? collect($peerGroups)->flatMap(fn ($group) => $group['subject_ids'])->unique()->values()->all()
                : array_values(array_map('intval', $validated['subject_ids'] ?? []));

            $items['custom_subject_ids'] = $peerSelectedIds;
            $items['custom_scope_groups'] = $peerGroups;
            $items['program_ids'] = [];
            $items['strand_ids'] = [];
            $items['year_level_ids'] = [];
            $items[$scopeConfig['items_key']] = $peerSelectedIds;
        } else {
            $customGroups = collect($validated['groups'] ?? [])
                ->filter(fn ($group) => !empty($group['questionnaire_id']) && !empty($group['subject_ids']))
                ->map(fn ($group, $index) => [
                    'id' => $validated['scope_type'] . '-' . ((int) $validated['scope_id']) . '-' . $index,
                    'questionnaire_id' => (int) $group['questionnaire_id'],
                    'subject_ids' => array_values(array_map('intval', $group['subject_ids'] ?? [])),
                ])
                ->values()
                ->all();

            $items['custom_scope_groups'] = $customGroups;
            $items['custom_subject_ids'] = !empty($customGroups)
                ? collect($customGroups)->flatMap(fn ($group) => $group['subject_ids'])->unique()->values()->all()
                : $allSelectedIds->all();
        }

        $distributionPayload = [
            'items' => json_encode($items),
            'updated_at' => now(),
        ];

        if ($validated['assignment_type'] === 'peer') {
            $firstPeerQuestionnaireId = (int) data_get($items, 'custom_scope_groups.0.questionnaire_id', 0);

            if ($firstPeerQuestionnaireId > 0) {
                $distributionPayload['questionnaire_id'] = $firstPeerQuestionnaireId;
            } elseif (!empty($validated['questionnaire_id'])) {
                $distributionPayload['questionnaire_id'] = (int) $validated['questionnaire_id'];
            }
        } elseif (!empty($validated['questionnaire_id'])) {
            $distributionPayload['questionnaire_id'] = (int) $validated['questionnaire_id'];
        }

        DB::table('questionnaire_distribution')
            ->where('id', $existingId)
            ->update($distributionPayload);

        $updatedSubjects = 0;

        if ($validated['assignment_type'] === 'student-teacher') {
            foreach (($items['custom_scope_groups'] ?? []) as $group) {
                $updatedSubjects += $this->applyQuestionnaireToSubjectIds(
                    $group['subject_ids'] ?? [],
                    (int) ($group['questionnaire_id'] ?? 0),
                );
            }
        } elseif ($validated['assignment_type'] === 'peer' && $validated['scope_type'] === 'department') {
            $this->syncPeerTeacherQuestionnaires(
                (int) $validated['scope_id'],
                $items,
                !empty($validated['questionnaire_id']) ? (int) $validated['questionnaire_id'] : null,
            );
        }

        if (
            $validated['scope_type'] === 'program'
            && Schema::hasTable('custom_subject')
            && Schema::hasColumn('custom_subject', 'questionnaire_id')
            && !empty($validated['groups'])
        ) {
            DB::table('custom_subject')
                ->where('program_id', (int) $validated['scope_id'])
                ->update([
                    'is_deleted' => 1,
                    'updated_at' => now(),
                ]);

            foreach ($validated['groups'] as $group) {
                DB::table('custom_subject')->insert([
                    'program_id' => (int) $validated['scope_id'],
                    'questionnaire_id' => (int) $group['questionnaire_id'],
                    'subject_ids' => json_encode(array_values(array_map('intval', $group['subject_ids'] ?? []))),
                    'is_activated' => 1,
                    'is_deleted' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        } elseif ($validated['scope_type'] === 'program' && Schema::hasTable('custom_subject')) {
            $hasCustomSubjectQuestionnaireId = Schema::hasColumn('custom_subject', 'questionnaire_id');
            $subjectIdsPayload = json_encode(array_values(array_map('intval', $validated['subject_ids'] ?? [])));

            if ($hasCustomSubjectQuestionnaireId && !empty($validated['questionnaire_id'])) {
                $existingCustomSubject = DB::table('custom_subject')
                    ->where('program_id', (int) $validated['scope_id'])
                    ->where('questionnaire_id', (int) $validated['questionnaire_id'])
                    ->first();

                $payload = [
                    'program_id' => (int) $validated['scope_id'],
                    'questionnaire_id' => (int) $validated['questionnaire_id'],
                    'subject_ids' => $subjectIdsPayload,
                    'is_activated' => 1,
                    'is_deleted' => 0,
                    'updated_at' => now(),
                ];

                if ($existingCustomSubject) {
                    DB::table('custom_subject')
                        ->where('id', $existingCustomSubject->id)
                        ->update($payload);
                } else {
                    DB::table('custom_subject')->insert([
                        ...$payload,
                        'created_at' => now(),
                    ]);
                }
            } else {
                $existingCustomSubject = DB::table('custom_subject')
                    ->where('program_id', (int) $validated['scope_id'])
                    ->first();

                $payload = [
                    'program_id' => (int) $validated['scope_id'],
                    'subject_ids' => $subjectIdsPayload,
                    'is_activated' => 1,
                    'is_deleted' => 0,
                    'updated_at' => now(),
                ];

                if ($existingCustomSubject) {
                    DB::table('custom_subject')
                        ->where('id', $existingCustomSubject->id)
                        ->update($payload);
                } else {
                    DB::table('custom_subject')->insert([
                        ...$payload,
                        'created_at' => now(),
                    ]);
                }
            }
        }

        return back()->with('success', $validated['assignment_type'] === 'peer'
            ? 'Custom peer scopes updated.'
            : 'Custom subjects updated. Applied questionnaire IDs to ' . $updatedSubjects . ' selected subject' . ($updatedSubjects === 1 ? '.' : 's.'));
    }

    public function destroy(int $id)
    {
        $distribution = DB::table('questionnaire_distribution')->where('id', $id)->first();
        $items = json_decode($distribution?->items ?? '{}', true) ?: [];

        if ($response = $this->blockIfDepartmentEvaluationStarted(
            $this->departmentIdFromDistributionScope($items),
            $distribution?->academic_year_id ? (int) $distribution->academic_year_id : null,
        )) {
            return $response;
        }

        DB::table('questionnaire_distribution')->where('id', $id)->update(['is_deleted' => 1, 'updated_at' => now()]);
        return back()->with('success', 'Assignment removed.');
    }
}
