<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
        $typeCode = self::TYPE_CODE_MAP[$assignmentType] ?? self::TYPE_CODE_MAP['student-teacher'];

        $assignments = $this->baseQuery($search)
            ->where('qt.code', $typeCode)
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

        $branches = DB::table('branch')
            ->select('id', 'code', 'name')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('name')
            ->get();

        $departments = DB::table('department')
            ->select('id', 'code', 'name', 'branch_id', 'is_activated')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('name')
            ->get();

        $programs = DB::table('program')
            ->select('id', 'code', 'name', 'department_id', 'is_activated')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('name')
            ->get();

        $strands = DB::table('strand')
            ->select('id', 'code', 'name', 'department_id', 'is_activated')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('name')
            ->get();

        $yearLevels = DB::table('education_level')
            ->select('id', 'department_id', 'program_id', 'year_level', 'section', 'subject_id', 'is_activated')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('year_level')
            ->orderBy('section')
            ->get();

        $subjects = DB::table('subject')
            ->select('id', 'code', 'name', 'department_id', 'program_id', 'strand_id', 'is_activated')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('name')
            ->get();

        $selectedQuestionnaires = $this->buildSelectedQuestionnaireMap($typeCode);
        $customSubjectGroups = $this->buildCustomSubjectGroups();

        return Inertia::render('Admin/Assignments', [
            'assignments'    => $assignments,
            'assignmentType' => $assignmentType,
            'filters'        => ['search' => $search],
            'questionnaires' => $questionnaires,
            'branches'       => $branches,
            'departments'    => $departments,
            'programs'       => $programs,
            'strands'        => $strands,
            'yearLevels'     => $yearLevels,
            'subjects'       => $subjects,
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

    private function buildSelectedQuestionnaireMap(string $typeCode): array
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
            ->get();

        $map = [];

        foreach ($distributions as $distribution) {
            $items = json_decode($distribution->items ?? '{}', true) ?: [];

            if (!empty($items['department_id'])) {
                $map['department-' . (int) $items['department_id']] = [
                    'distribution_id' => $distribution->id,
                    'questionnaire_id' => $distribution->questionnaire_id,
                    'questionnaire_code' => $distribution->questionnaire_code,
                    'questionnaire_title' => $distribution->questionnaire_title,
                    'custom_subject_ids' => array_values(array_map('intval', $items['custom_subject_ids'] ?? [])),
                ];
            }

            foreach (($items['program_ids'] ?? []) as $programId) {
                $map['program-' . (int) $programId] = [
                    'distribution_id' => $distribution->id,
                    'questionnaire_id' => $distribution->questionnaire_id,
                    'questionnaire_code' => $distribution->questionnaire_code,
                    'questionnaire_title' => $distribution->questionnaire_title,
                    'custom_subject_ids' => $customSubjectMap[(int) $programId . ':' . (int) $distribution->questionnaire_id]
                        ?? array_values(array_map('intval', $items['custom_subject_ids'] ?? [])),
                ];
            }

            foreach (($items['strand_ids'] ?? []) as $strandId) {
                $map['strand-' . (int) $strandId] = [
                    'distribution_id' => $distribution->id,
                    'questionnaire_id' => $distribution->questionnaire_id,
                    'questionnaire_code' => $distribution->questionnaire_code,
                    'questionnaire_title' => $distribution->questionnaire_title,
                    'custom_subject_ids' => array_values(array_map('intval', $items['custom_subject_ids'] ?? [])),
                ];
            }

            foreach (($items['year_level_ids'] ?? []) as $yearLevelId) {
                $map['level-' . (int) $yearLevelId] = [
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

            if ($scopeType === 'level' && in_array($scopeId, array_map('intval', $items['year_level_ids'] ?? []), true)) {
                return (int) $distribution->id;
            }
        }

        return null;
    }

    private function validateDistributionScope(Request $request): array
    {
        return $request->validate([
            'branch_id'        => 'nullable|integer|exists:branch,id',
            'department_id'    => 'nullable|integer|exists:department,id',
            'program_ids'      => 'nullable|array',
            'program_ids.*'    => 'integer|exists:program,id',
            'strand_ids'       => 'nullable|array',
            'strand_ids.*'     => 'integer|exists:strand,id',
            'year_level_ids'   => 'nullable|array',
            'year_level_ids.*' => 'integer|exists:education_level,id',
        ]);
    }

    private function buildDistributionItems(array $validated): string
    {
        return json_encode([
            'branch_id' => $validated['branch_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'program_ids' => array_values(array_map('intval', $validated['program_ids'] ?? [])),
            'strand_ids' => array_values(array_map('intval', $validated['strand_ids'] ?? [])),
            'year_level_ids' => array_values(array_map('intval', $validated['year_level_ids'] ?? [])),
        ]);
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
            'scope_type' => 'required|string|in:department,program,strand,level',
            'scope_id' => 'required|integer',
            'branch_id' => 'nullable|integer|exists:branch,id',
            'department_id' => 'nullable|integer|exists:department,id',
        ]);

        $typeCode = self::TYPE_CODE_MAP[$validated['assignment_type']] ?? self::TYPE_CODE_MAP['student-teacher'];
        $existingId = $this->findExistingDistributionId($typeCode, $validated['scope_type'], (int) $validated['scope_id']);

        $items = [
            'branch_id' => $validated['branch_id'] ?? null,
            'department_id' => $validated['scope_type'] === 'department'
                ? (int) $validated['scope_id']
                : ($validated['department_id'] ?? null),
            'program_ids' => $validated['scope_type'] === 'program' ? [(int) $validated['scope_id']] : [],
            'strand_ids' => $validated['scope_type'] === 'strand' ? [(int) $validated['scope_id']] : [],
            'year_level_ids' => $validated['scope_type'] === 'level' ? [(int) $validated['scope_id']] : [],
            'custom_subject_ids' => [],
        ];

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

        return back()->with('success', 'Questionnaire selected.');
    }

    public function updateCustomSubjects(Request $request)
    {
        $validated = $request->validate([
            'assignment_type' => 'required|string|in:student-teacher,peer,head,employee',
            'scope_type' => 'required|string|in:program,strand,level',
            'scope_id' => 'required|integer',
            'questionnaire_id' => 'nullable|integer|exists:questionnaires,id',
            'groups' => 'nullable|array',
            'groups.*.questionnaire_id' => 'required_with:groups|integer|exists:questionnaires,id',
            'groups.*.subject_ids' => 'nullable|array',
            'groups.*.subject_ids.*' => 'integer|exists:subject,id',
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'integer|exists:subject,id',
        ]);

        $typeCode = self::TYPE_CODE_MAP[$validated['assignment_type']] ?? self::TYPE_CODE_MAP['student-teacher'];
        $existingId = $this->findExistingDistributionId($typeCode, $validated['scope_type'], (int) $validated['scope_id']);

        if (! $existingId) {
            return back()->with('error', 'Select a questionnaire first before customizing subjects.');
        }

        $distribution = DB::table('questionnaire_distribution')->where('id', $existingId)->first();
        $items = json_decode($distribution->items ?? '{}', true) ?: [];
        $items['custom_subject_ids'] = array_values(array_map('intval', $validated['subject_ids'] ?? []));

        DB::table('questionnaire_distribution')
            ->where('id', $existingId)
            ->update([
                'items' => json_encode($items),
                'updated_at' => now(),
            ]);

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

        return back()->with('success', 'Custom subjects updated.');
    }

    public function destroy(int $id)
    {
        DB::table('questionnaire_distribution')->where('id', $id)->update(['is_deleted' => 1, 'updated_at' => now()]);
        return back()->with('success', 'Assignment removed.');
    }
}
