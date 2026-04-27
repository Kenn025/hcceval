<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class OutstandingAwardsController extends Controller
{
    public function index(Request $request): Response
    {
        $branches = $this->branches();
        $selectedBranchId = $this->selectedBranchId($request, $branches);
        $academicYear = $this->activeAcademicYear();

        return Inertia::render('Admin/OutstandingAwards', [
            'branches' => $branches,
            'filters' => [
                'branch_id' => $selectedBranchId,
            ],
            'activeAcademicYear' => $academicYear,
            'mostRatedProgramChair' => $academicYear && $selectedBranchId
                ? $this->topProgramChair($academicYear->id, $selectedBranchId)
                : null,
            'outstandingTeacher' => $academicYear && $selectedBranchId
                ? $this->topOverallTeacher($academicYear->id, $selectedBranchId)
                : null,
            'outstandingTeachersByProgram' => $academicYear && $selectedBranchId
                ? $this->topTeachersByProgram($academicYear->id, $selectedBranchId)
                : [],
            'outstandingTeachersByDepartment' => $academicYear && $selectedBranchId
                ? $this->topTeachersByDepartment($academicYear->id, $selectedBranchId)
                : [],
        ]);
    }

    private function branches(): array
    {
        return DB::table('branch')
            ->select('id', 'name', 'code')
            ->where('is_deleted', 0)
            ->where('code', '!=', 'OVERALL')
            ->when($this->scopedBranchId(), fn ($query, int $branchId) => $query->where('id', $branchId))
            ->orderBy('name')
            ->get()
            ->map(fn (object $branch) => [
                'id' => (int) $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
            ])
            ->all();
    }

    private function selectedBranchId(Request $request, array $branches): ?int
    {
        if ($this->scopedBranchId()) {
            return $this->scopedBranchId();
        }

        $requested = $request->integer('branch_id');
        $branchIds = collect($branches)->pluck('id');

        if ($requested && $branchIds->contains($requested)) {
            return $requested;
        }

        return $branchIds->first();
    }

    private function activeAcademicYear(): ?object
    {
        return DB::table('academic_year')
            ->select('id', 'from_year', 'to_year', 'term')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderByDesc('id')
            ->first();
    }

    private function topProgramChair(int $academicYearId, int $branchId): ?array
    {
        $row = DB::table('ratings_head as rh')
            ->join('employee as e', 'rh.employee_id', '=', 'e.id')
            ->leftJoin('program as p', 'e.program_id', '=', 'p.id')
            ->where('rh.academic_year_id', $academicYearId)
            ->where('e.branch_id', $branchId)
            ->where('e.is_deleted', 0)
            ->select(
                'e.id',
                DB::raw("TRIM(CONCAT(e.firstname, ' ', COALESCE(e.middlename, ''), ' ', e.lastname)) as name"),
                DB::raw("COALESCE(p.name, 'Unassigned Program') as program_name"),
                DB::raw("AVG(JSON_UNQUOTE(JSON_EXTRACT(rh.overall_ratings, '$.average'))) as score"),
                DB::raw('SUM(rh.submission_count) as response_count')
            )
            ->groupBy('e.id', 'e.firstname', 'e.middlename', 'e.lastname', 'p.name')
            ->orderByDesc('score')
            ->orderByDesc('response_count')
            ->first();

        if (! $row) {
            return null;
        }

        $ranking = $this->rankingRow($row);
        $ranking['evaluation_summaries'] = $this->personEvaluationSummaries((int) $row->id, $academicYearId, $branchId, true);

        return $ranking;
    }

    private function topOverallTeacher(int $academicYearId, int $branchId): ?array
    {
        $row = $this->teacherRatingsBase($academicYearId, $branchId)
            ->select(
                'e.id',
                DB::raw("TRIM(CONCAT(e.firstname, ' ', COALESCE(e.middlename, ''), ' ', e.lastname)) as name"),
                DB::raw("AVG(JSON_UNQUOTE(JSON_EXTRACT(rs.overall_ratings, '$.average'))) as score"),
                DB::raw('SUM(rs.submission_count) as response_count'),
                DB::raw('COUNT(DISTINCT rs.subject_id) as subject_count')
            )
            ->groupBy('e.id', 'e.firstname', 'e.middlename', 'e.lastname')
            ->orderByDesc('score')
            ->orderByDesc('response_count')
            ->first();

        if (! $row) {
            return null;
        }

        $ranking = $this->rankingRow($row);
        $ranking['evaluation_summaries'] = $this->personEvaluationSummaries((int) $row->id, $academicYearId, $branchId);

        return $ranking;
    }

    private function topTeachersByProgram(int $academicYearId, int $branchId): array
    {
        $rows = $this->teacherRatingsBase($academicYearId, $branchId)
            ->join('program as p', 's.program_id', '=', 'p.id')
            ->select(
                'p.id as program_id',
                'p.name as program_name',
                'rs.academic_year_id',
                'e.branch_id',
                'e.id',
                DB::raw("TRIM(CONCAT(e.firstname, ' ', COALESCE(e.middlename, ''), ' ', e.lastname)) as name"),
                DB::raw("AVG(JSON_UNQUOTE(JSON_EXTRACT(rs.overall_ratings, '$.average'))) as score"),
                DB::raw('SUM(rs.submission_count) as response_count'),
                DB::raw('COUNT(DISTINCT rs.subject_id) as subject_count')
            )
            ->groupBy('p.id', 'p.name', 'rs.academic_year_id', 'e.branch_id', 'e.id', 'e.firstname', 'e.middlename', 'e.lastname')
            ->orderBy('p.name')
            ->orderByDesc('score')
            ->orderByDesc('response_count')
            ->get();

        return $rows
            ->groupBy('program_id')
            ->map(function (Collection $programRows) {
                $top = $programRows->first();

                return [
                    'program_id' => (int) $top->program_id,
                    'program_name' => $top->program_name,
                    'teacher' => array_merge($this->rankingRow($top), [
                        'evaluation_summaries' => $this->personEvaluationSummaries(
                            (int) $top->id,
                            (int) $top->academic_year_id,
                            (int) $top->branch_id,
                            false,
                            (int) $top->program_id,
                        ),
                    ]),
                ];
            })
            ->values()
            ->all();
    }

    private function topTeachersByDepartment(int $academicYearId, int $branchId): array
    {
        $rows = $this->teacherRatingsBase($academicYearId, $branchId)
            ->join('department as d', 's.department_id', '=', 'd.id')
            ->select(
                'd.id as department_id',
                'd.name as department_name',
                'd.code as department_code',
                'rs.academic_year_id',
                'e.branch_id',
                'e.id',
                DB::raw("TRIM(CONCAT(e.firstname, ' ', COALESCE(e.middlename, ''), ' ', e.lastname)) as name"),
                DB::raw("COALESCE(p.name, st.name, d.name, 'Unassigned Department') as program_name"),
                DB::raw("AVG(JSON_UNQUOTE(JSON_EXTRACT(rs.overall_ratings, '$.average'))) as score"),
                DB::raw('SUM(rs.submission_count) as response_count'),
                DB::raw('COUNT(DISTINCT rs.subject_id) as subject_count')
            )
            ->leftJoin('program as p', 's.program_id', '=', 'p.id')
            ->leftJoin('strand as st', 's.strand_id', '=', 'st.id')
            ->groupBy('d.id', 'd.name', 'd.code', 'rs.academic_year_id', 'e.branch_id', 'e.id', 'e.firstname', 'e.middlename', 'e.lastname', 'p.name', 'st.name')
            ->orderBy('d.name')
            ->orderByDesc('score')
            ->orderByDesc('response_count')
            ->get();

        return $rows
            ->groupBy('department_id')
            ->map(function (Collection $departmentRows) {
                $top = $departmentRows->first();

                return [
                    'department_id' => (int) $top->department_id,
                    'department_name' => $top->department_name,
                    'department_code' => $top->department_code,
                    'teacher' => array_merge($this->rankingRow($top), [
                        'department_name' => $top->department_name,
                        'department_code' => $top->department_code,
                        'evaluation_summaries' => $this->personEvaluationSummaries(
                            (int) $top->id,
                            (int) $top->academic_year_id,
                            (int) $top->branch_id,
                            false,
                            null,
                            (int) $top->department_id,
                        ),
                    ]),
                ];
            })
            ->values()
            ->all();
    }

    private function teacherRatingsBase(int $academicYearId, int $branchId)
    {
        return DB::table('ratings_subject as rs')
            ->join('employee as e', 'rs.employee_id', '=', 'e.id')
            ->join('subject as s', 'rs.subject_id', '=', 's.id')
            ->where('rs.academic_year_id', $academicYearId)
            ->where('e.branch_id', $branchId)
            ->where('e.is_deleted', 0)
            ->whereNotNull('rs.employee_id')
            ->whereRaw("LOWER(COALESCE(s.type, '')) != ?", ['elementary'])
            ->whereNotIn('s.department_id', function ($query) {
                $query->select('id')
                    ->from('department')
                    ->where(function ($query) {
                        $query->where('name', 'like', '%Elementary%')
                            ->orWhere('code', 'like', '%ELEM%');
                    });
            })
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(rs.overall_ratings, '$.average')) IS NOT NULL");
    }

    private function rankingRow(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'name' => $row->name,
            'program_name' => $row->program_name ?? null,
            'score' => round((float) $row->score, 2),
            'response_count' => (int) ($row->response_count ?? 0),
            'subject_count' => (int) ($row->subject_count ?? 0),
        ];
    }

    private function personEvaluationSummaries(int $employeeId, int $academicYearId, int $branchId, bool $includeHead = false, ?int $programId = null, ?int $departmentId = null): array
    {
        $summaries = [];

        if ($includeHead) {
            $summaries = array_merge($summaries, $this->evaluationSummaries('head', $employeeId, $academicYearId, $branchId));
        }

        return array_merge(
            $summaries,
            $this->evaluationSummaries('peer', $employeeId, $academicYearId, $branchId),
            $this->evaluationSummaries('subject', $employeeId, $academicYearId, $branchId, $programId, $departmentId),
        );
    }

    private function evaluationSummaries(string $type, int $employeeId, int $academicYearId, int $branchId, ?int $programId = null, ?int $departmentId = null): array
    {
        if (! Schema::hasTable('evaluation_submissions') || ! Schema::hasColumn('evaluation_submissions', 'answers')) {
            return [];
        }

        $questionnaireTypeId = $this->questionnaireTypeIdByCode(match ($type) {
            'head' => 'QTYPE-HEAD',
            'peer' => 'QTYPE-PEER',
            default => 'QTYPE-SUBJECT',
        });
        $teacherIds = $this->candidateTeacherIdsForEmployee($employeeId);
        $query = DB::table('evaluation_submissions as es')
            ->leftJoin('subject as s', 'es.subject_id', '=', 's.id')
            ->select(
                'es.id',
                'es.questionnaire_id',
                'es.subject_id',
                'es.answers',
                'es.overall_average',
                's.code as subject_code',
                's.name as subject_name',
            )
            ->where('es.academic_year_id', $academicYearId)
            ->where('es.branch_id', $branchId);

        if ($questionnaireTypeId && Schema::hasColumn('evaluation_submissions', 'questionnaire_type_id')) {
            $query->where('es.questionnaire_type_id', $questionnaireTypeId);
        }

        $query->where(function ($query) use ($employeeId, $teacherIds) {
            if (Schema::hasColumn('evaluation_submissions', 'employee_id')) {
                $query->orWhere('es.employee_id', $employeeId);
            }

            if (Schema::hasColumn('evaluation_submissions', 'teacher_id') && ! empty($teacherIds)) {
                $query->orWhereIn('es.teacher_id', $teacherIds);
            }
        });

        if ($type === 'subject') {
            $query->whereNotNull('es.subject_id');
        } else {
            $query->whereNull('es.subject_id');
        }

        if ($programId) {
            $query->where('s.program_id', $programId);
        }

        if ($departmentId) {
            $query->where('s.department_id', $departmentId);
        }

        $rows = $query->get();
        $questionnaires = $this->questionnaireDetails(
            $rows->pluck('questionnaire_id')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all()
        );

        return $rows
            ->groupBy(fn (object $row) => $type === 'subject'
                ? ((int) ($row->questionnaire_id ?? 0)) . ':all-subjects'
                : ((int) ($row->questionnaire_id ?? 0)) . ':' . ((int) ($row->subject_id ?? 0)))
            ->map(function (Collection $groupRows) use ($questionnaires, $type) {
                $first = $groupRows->first();
                $questionBuckets = [];
                $overallValues = [];

                foreach ($groupRows as $row) {
                    if (is_numeric($row->overall_average)) {
                        $overallValues[] = (float) $row->overall_average;
                    }

                    foreach ($this->answerRatings($row->answers) as $questionId => $rating) {
                        $questionBuckets[$questionId] ??= [];
                        $questionBuckets[$questionId][] = $rating;
                    }
                }

                $questionRatings = collect($questionBuckets)
                    ->mapWithKeys(fn (array $values, int $questionId) => [
                        (string) $questionId => [
                            'average' => count($values) ? round(array_sum($values) / count($values), 2) : null,
                            'count' => count($values),
                        ],
                    ])
                    ->all();
                $questionnaireId = $first->questionnaire_id ? (int) $first->questionnaire_id : null;
                $allRatings = collect($questionRatings)->pluck('average')->filter(fn ($value) => $value !== null);

                return [
                    'type' => $type,
                    'questionnaire_id' => $questionnaireId,
                    'questionnaire' => $questionnaireId ? ($questionnaires[$questionnaireId] ?? null) : null,
                    'subject_id' => $type === 'subject' ? null : ($first->subject_id ? (int) $first->subject_id : null),
                    'subject_code' => $type === 'subject' ? null : $first->subject_code,
                    'subject_name' => $type === 'subject' ? null : $first->subject_name,
                    'submission_count' => $groupRows->count(),
                    'overall_rating' => count($overallValues)
                        ? round(array_sum($overallValues) / count($overallValues), 2)
                        : ($allRatings->isNotEmpty() ? round((float) $allRatings->avg(), 2) : null),
                    'question_ratings' => $questionRatings,
                ];
            })
            ->sortBy(fn (array $summary) => ($summary['subject_name'] ?? '') . ($summary['questionnaire']['title'] ?? ''))
            ->values()
            ->all();
    }

    private function candidateTeacherIdsForEmployee(int $employeeId): array
    {
        if (! Schema::hasTable('teacher')) {
            return [];
        }

        $employee = DB::table('employee')
            ->select('firstname', 'middlename', 'lastname', 'branch_id', 'department_id', 'program_id', 'strand_id')
            ->where('id', $employeeId)
            ->first();

        if (! $employee) {
            return [];
        }

        return DB::table('teacher')
            ->where('is_deleted', 0)
            ->where('branch_id', $employee->branch_id)
            ->whereRaw('LOWER(TRIM(firstname)) = ?', [strtolower(trim((string) $employee->firstname))])
            ->whereRaw('LOWER(TRIM(lastname)) = ?', [strtolower(trim((string) $employee->lastname))])
            ->when($employee->department_id, fn ($query) => $query->where('department_id', $employee->department_id))
            ->when($employee->program_id, fn ($query) => $query->where('program_id', $employee->program_id))
            ->when($employee->strand_id, fn ($query) => $query->where('strand_id', $employee->strand_id))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function answerRatings(mixed $answers): array
    {
        $decoded = is_string($answers) ? json_decode($answers, true) : $answers;

        if (! is_array($decoded)) {
            return [];
        }

        return collect($decoded)
            ->filter(fn ($answer) => is_array($answer) && ! empty($answer['question_id']) && isset($answer['rating']) && is_numeric($answer['rating']))
            ->mapWithKeys(fn ($answer) => [(int) $answer['question_id'] => (float) $answer['rating']])
            ->all();
    }

    private function questionnaireTypeIdByCode(string $code): ?int
    {
        if (! Schema::hasTable('questionnaire_type')) {
            return null;
        }

        $id = DB::table('questionnaire_type')
            ->where('code', $code)
            ->value('id');

        return $id ? (int) $id : null;
    }

    private function questionnaireDetails(array $questionnaireIds): array
    {
        $questionnaireIds = collect($questionnaireIds)->filter()->map(fn ($id) => (int) $id)->unique()->values()->all();

        if (empty($questionnaireIds) || ! Schema::hasTable('questionnaires') || ! Schema::hasTable('question')) {
            return [];
        }

        $rows = DB::table('questionnaires as q')
            ->leftJoin('questionnaire_type as qt', 'qt.id', '=', 'q.questionnaire_type_id')
            ->select('q.id', 'q.code', 'q.title', 'q.items', 'q.notes', 'qt.name as questionnaire_type_name')
            ->whereIn('q.id', $questionnaireIds)
            ->where('q.is_deleted', 0)
            ->get();

        $questionIds = $rows
            ->flatMap(function (object $row) {
                $items = json_decode($row->items ?? '{}', true) ?: [];

                return collect($items['scale_questions'] ?? [])
                    ->flatMap(fn ($group) => collect($group['questions'] ?? [])
                        ->map(fn ($question) => is_array($question) ? (int) ($question['question_id'] ?? 0) : (int) $question));
            })
            ->filter()
            ->unique()
            ->values()
            ->all();

        $questionMap = DB::table('question')
            ->select('id', 'description')
            ->whereIn('id', $questionIds)
            ->get()
            ->keyBy('id');

        return $rows
            ->mapWithKeys(function (object $row) use ($questionMap) {
                $items = json_decode($row->items ?? '{}', true) ?: [];
                $scaleQuestions = collect($items['scale_questions'] ?? [])
                    ->map(function ($group) use ($questionMap) {
                        return [
                            'class_name' => $group['class_name'] ?? 'Questionnaire Items',
                            'weight_percentage' => isset($group['weight_percentage']) ? (int) $group['weight_percentage'] : null,
                            'questions' => collect($group['questions'] ?? [])
                                ->map(function ($question) use ($questionMap) {
                                    $questionId = is_array($question) ? (int) ($question['question_id'] ?? 0) : (int) $question;

                                    return [
                                        'question_id' => $questionId,
                                        'description' => data_get($questionMap->get($questionId), 'description') ?? "Question #{$questionId}",
                                    ];
                                })
                                ->filter(fn ($question) => ! empty($question['question_id']))
                                ->values()
                                ->all(),
                        ];
                    })
                    ->values()
                    ->all();

                return [(int) $row->id => [
                    'id' => (int) $row->id,
                    'questionnaire_code' => $row->code,
                    'title' => $row->title,
                    'questionnaire_type_name' => $row->questionnaire_type_name,
                    'notes' => $row->notes,
                    'scale_questions' => $scaleQuestions,
                ]];
            })
            ->all();
    }
}
