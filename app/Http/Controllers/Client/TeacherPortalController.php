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
        $subjectTable = Schema::hasTable('subjects')
            ? 'subjects'
            : (Schema::hasTable('subject') ? 'subject' : null);

        if (
            ! Schema::hasTable('subject_sections') ||
            ! Schema::hasTable('sections') ||
            ! $subjectTable
        ) {
            return [];
        }

        return DB::table('subject_sections as ss')
            ->join('sections as sec', 'sec.id', '=', 'ss.section_id')
            ->join($subjectTable . ' as subj', 'subj.id', '=', 'ss.subject_id')
            ->leftJoin('department as d', 'd.id', '=', 'subj.department_id')
            ->select(
                DB::raw("CONCAT('section-', ss.id) as class_key"),
                'ss.subject_id',
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
                    'subject_id' => (int) $subject->id,
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
                    'subject_id' => null,
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

    private function buildAssignedSubjectClasses(Teacher $teacher, string $defaultSemesterLabel, ?string $schoolYear = null): array
    {
        if (! Schema::hasTable('subject')) {
            return [];
        }

        $subjectIds = collect($teacher->assigned_subject_ids ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        if ($subjectIds->isEmpty()) {
            return [];
        }

        return Subject::query()
            ->with(['department:id,name'])
            ->whereIn('id', $subjectIds->all())
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('name')
            ->get()
            ->map(fn (Subject $subject) => [
                'class_key' => 'assigned-subject-' . $subject->id,
                'subject_id' => (int) $subject->id,
                'section_id' => null,
                'section_name' => 'Assigned Subject',
                'school_year' => $schoolYear,
                'term' => null,
                'schedule' => null,
                'room' => null,
                'course_code' => $subject->code,
                'course_name' => $subject->name,
                'department_name' => $subject->department?->name ?? $teacher->department?->name ?? '',
                'scope_label' => $subject->type ? strtoupper((string) $subject->type) : '',
                'semester_label' => $defaultSemesterLabel,
                'enrolled_count' => 0,
            ])
            ->values()
            ->all();
    }

    private function subjectRatingsForClasses(Teacher $teacher, array $classes, object $cycle, string $schoolYear, array $terms): array
    {
        $subjects = collect($classes)
            ->filter(fn (array $class) => ! empty($class['subject_id']))
            ->groupBy(fn (array $class) => (int) $class['subject_id'])
            ->map(function (Collection $subjectClasses, int $subjectId) {
                $first = $subjectClasses->first();

                return [
                    'subject_id' => $subjectId,
                    'course_code' => $first['course_code'] ?? '',
                    'course_name' => $first['course_name'] ?? 'Subject',
                    'department_name' => $first['department_name'] ?? '',
                    'scope_label' => $first['scope_label'] ?? '',
                    'semester_label' => $first['semester_label'] ?? '',
                    'sections' => $subjectClasses
                        ->pluck('section_name')
                        ->filter()
                        ->unique()
                        ->values()
                        ->all(),
                    'enrolled_count' => $subjectClasses->sum(fn (array $class) => (int) ($class['enrolled_count'] ?? 0)),
                ];
            })
            ->values();

        if ($subjects->isEmpty()) {
            return [];
        }

        $ratingsBySubject = collect();

        if (
            Schema::hasTable('evaluation_submissions') &&
            Schema::hasColumn('evaluation_submissions', 'subject_id') &&
            Schema::hasColumn('evaluation_submissions', 'academic_year_id')
        ) {
            $selects = ['id', 'subject_id', 'questionnaire_id', 'answers', 'created_at', 'updated_at'];

            foreach (['teacher_id', 'overall_average', 'submitted_at', 'school_year', 'term'] as $column) {
                if (Schema::hasColumn('evaluation_submissions', $column)) {
                    $selects[] = $column;
                }
            }

            $query = DB::table('evaluation_submissions')
                ->select($selects)
                ->where('academic_year_id', (int) $cycle->id)
                ->whereIn('subject_id', $subjects->pluck('subject_id')->all());

            $ratingsBySubject = $query
                ->get()
                ->groupBy(fn ($row) => (int) $row->subject_id)
                ->map(function (Collection $rows) {
                    $first = $rows->first();
                    $questionBuckets = [];
                    $ratings = $rows->flatMap(function ($row) use (&$questionBuckets) {
                        $answers = json_decode((string) ($row->answers ?? '[]'), true);

                        if (! is_array($answers)) {
                            return [];
                        }

                        return collect($answers)
                            ->map(function ($answer) use (&$questionBuckets) {
                                $questionId = (int) ($answer['question_id'] ?? 0);
                                $rating = $answer['rating'] ?? null;

                                if (! $questionId || ! is_numeric($rating)) {
                                    return null;
                                }

                                $questionBuckets[$questionId] ??= [];
                                $questionBuckets[$questionId][] = (float) $rating;

                                return (float) $rating;
                            })
                            ->filter(fn ($rating) => $rating !== null)
                            ->all();
                    });
                    $questionnaireId = $first?->questionnaire_id ? (int) $first->questionnaire_id : null;
                    $questionRatings = collect($questionBuckets)
                        ->mapWithKeys(fn (array $values, int $questionId) => [
                            (string) $questionId => [
                                'average' => count($values) ? round(array_sum($values) / count($values), 2) : null,
                                'count' => count($values),
                            ],
                        ])
                        ->all();
                    $questions = $questionnaireId
                        ? $this->questionnaireQuestions($questionnaireId)
                            ->map(fn ($question) => [
                                'question_id' => (int) $question->question_id,
                                'question_text' => $question->question_text,
                                'class_name' => $question->class_name ?? '',
                                'weight_percentage' => $question->weight_percentage ?? null,
                                'average' => $questionRatings[(string) $question->question_id]['average'] ?? null,
                                'count' => $questionRatings[(string) $question->question_id]['count'] ?? 0,
                            ])
                            ->values()
                            ->all()
                        : collect($questionRatings)
                            ->map(fn ($rating, string $questionId) => [
                                'question_id' => (int) $questionId,
                                'question_text' => 'Question #' . $questionId,
                                'class_name' => '',
                                'weight_percentage' => null,
                                'average' => $rating['average'] ?? null,
                                'count' => $rating['count'] ?? 0,
                            ])
                            ->values()
                            ->all();
                    $classRatings = collect($questions)
                        ->groupBy(fn (array $question) => trim((string) ($question['class_name'] ?? '')) ?: 'Uncategorized')
                        ->map(function (Collection $classQuestions, string $className) {
                            $averages = $classQuestions
                                ->pluck('average')
                                ->filter(fn ($value) => $value !== null);
                            $average = $averages->isNotEmpty() ? round($averages->avg(), 2) : null;

                            return [
                                'class_name' => $className,
                                'weight_percentage' => $classQuestions->first()['weight_percentage'] ?? null,
                                'average' => $average,
                                'percentage' => $average !== null ? round(($average / 5) * 100, 2) : null,
                                'question_count' => $classQuestions->count(),
                                'response_count' => $classQuestions->sum(fn (array $question) => (int) ($question['count'] ?? 0)),
                            ];
                        })
                        ->values()
                        ->all();

                    return [
                        'submission_count' => $rows->count(),
                        'overall_rating' => $ratings->isNotEmpty() ? round($ratings->avg(), 2) : null,
                        'overall_percentage' => $ratings->isNotEmpty() ? round(($ratings->avg() / 5) * 100, 2) : null,
                        'questionnaire_id' => $questionnaireId,
                        'question_count' => count($questionBuckets),
                        'question_ratings' => $questionRatings,
                        'questions' => $questions,
                        'class_ratings' => $classRatings,
                        'latest_submitted_at' => optional($rows->sortByDesc(fn ($row) => $row->submitted_at ?? $row->updated_at ?? $row->created_at)->first())->submitted_at
                            ?? optional($rows->sortByDesc(fn ($row) => $row->updated_at ?? $row->created_at)->first())->updated_at
                            ?? optional($rows->sortByDesc('created_at')->first())->created_at,
                    ];
                });
        }

        return $subjects
            ->map(function (array $subject) use ($ratingsBySubject, $schoolYear, $cycle) {
                $rating = $ratingsBySubject->get((int) $subject['subject_id'], []);

                return $subject + [
                    'school_year' => $schoolYear,
                    'semester' => $this->semesterLabel($cycle->term ?? null),
                    'submission_count' => (int) ($rating['submission_count'] ?? 0),
                    'overall_rating' => $rating['overall_rating'] ?? null,
                    'overall_percentage' => $rating['overall_percentage'] ?? null,
                    'questionnaire_id' => $rating['questionnaire_id'] ?? null,
                    'question_count' => (int) ($rating['question_count'] ?? 0),
                    'question_ratings' => $rating['question_ratings'] ?? [],
                    'questions' => $rating['questions'] ?? [],
                    'class_ratings' => $rating['class_ratings'] ?? [],
                    'latest_submitted_at' => $rating['latest_submitted_at'] ?? null,
                ];
            })
            ->sortBy('course_name')
            ->values()
            ->all();
    }

    private function peerRatingsForTeacher(Teacher $teacher, ?object $cycle): array
    {
        $emptyGroup = fn (string $label) => [
            'label' => $label,
            'submission_count' => 0,
            'overall_rating' => null,
            'overall_percentage' => null,
            'questions' => [],
        ];

        $groups = [
            'inside' => $emptyGroup('Inside Faculty'),
            'outside' => $emptyGroup('Outside Faculty'),
        ];

        if (
            ! $cycle
            || ! Schema::hasTable('evaluation_submissions')
            || ! Schema::hasColumn('evaluation_submissions', 'teacher_id')
            || ! Schema::hasColumn('evaluation_submissions', 'academic_year_id')
        ) {
            return $groups;
        }

        $selects = ['id', 'questionnaire_id', 'questionnaire_type_id', 'answers'];

        if (Schema::hasColumn('evaluation_submissions', 'is_other')) {
            $selects[] = 'is_other';
        }

        $query = DB::table('evaluation_submissions')
            ->select($selects)
            ->where('academic_year_id', (int) $cycle->id)
            ->where('teacher_id', (int) $teacher->id);

        if (Schema::hasColumn('evaluation_submissions', 'subject_id')) {
            $query->whereNull('subject_id');
        }

        if (Schema::hasColumn('evaluation_submissions', 'employee_id')) {
            $query->whereNull('employee_id');
        }

        if (Schema::hasColumn('evaluation_submissions', 'category')) {
            $query->where('category', 'peer_teacher');
        } elseif ($peerTypeId = $this->questionnaireTypeIdByKeyword('peer')) {
            $query->where('questionnaire_type_id', $peerTypeId);
        }

        $rows = $query->get();

        return collect([
            'inside' => $rows->filter(fn ($row) => ! (bool) ($row->is_other ?? false)),
            'outside' => $rows->filter(fn ($row) => (bool) ($row->is_other ?? false)),
        ])->map(function (Collection $rows, string $key) use ($emptyGroup, $teacher) {
            $label = $key === 'outside' ? 'Outside Faculty' : 'Inside Faculty';

            if ($rows->isEmpty()) {
                return $emptyGroup($label);
            }

            $questionBuckets = [];
            $ratings = $rows->flatMap(function ($row) use (&$questionBuckets) {
                $answers = json_decode((string) ($row->answers ?? '[]'), true);

                if (! is_array($answers)) {
                    return [];
                }

                return collect($answers)
                    ->map(function ($answer) use (&$questionBuckets) {
                        $questionId = (int) ($answer['question_id'] ?? 0);
                        $rating = $answer['rating'] ?? null;

                        if (! $questionId || ! is_numeric($rating)) {
                            return null;
                        }

                        $questionBuckets[$questionId] ??= [];
                        $questionBuckets[$questionId][] = (float) $rating;

                        return (float) $rating;
                    })
                    ->filter(fn ($rating) => $rating !== null)
                    ->all();
            });

            $questionRatings = collect($questionBuckets)
                ->mapWithKeys(fn (array $values, int $questionId) => [
                    (string) $questionId => [
                        'average' => count($values) ? round(array_sum($values) / count($values), 2) : null,
                        'count' => count($values),
                    ],
                ]);
            $questionnaireId = $rows->pluck('questionnaire_id')->filter()->first() ?: $teacher->questionnaire_id;
            $questions = $this->questionnaireQuestions($questionnaireId ? (int) $questionnaireId : null)
                ->map(fn ($question) => [
                    'question_id' => (int) $question->question_id,
                    'question_text' => $question->question_text,
                    'class_name' => $question->class_name ?? '',
                    'weight_percentage' => $question->weight_percentage ?? null,
                    'average' => $questionRatings->get((string) $question->question_id)['average'] ?? null,
                    'count' => $questionRatings->get((string) $question->question_id)['count'] ?? 0,
                ])
                ->values()
                ->all();
            $overall = $ratings->isNotEmpty() ? round($ratings->avg(), 2) : null;

            return [
                'label' => $label,
                'submission_count' => $rows->count(),
                'overall_rating' => $overall,
                'overall_percentage' => $overall !== null ? round(($overall / 5) * 100, 2) : null,
                'questions' => $questions,
            ];
        })->all();
    }

    private function averageFromAnswers(?string $answers): ?float
    {
        $decoded = json_decode((string) $answers, true);

        if (! is_array($decoded)) {
            return null;
        }

        $ratings = collect($decoded)
            ->pluck('rating')
            ->filter(fn ($rating) => is_numeric($rating))
            ->map(fn ($rating) => (float) $rating);

        return $ratings->isNotEmpty() ? round($ratings->avg(), 2) : null;
    }

    private function archiveFoldersForTeacher(Teacher $teacher, ?object $activeCycle): array
    {
        if (
            ! Schema::hasTable('evaluation_submissions')
            || ! Schema::hasTable('academic_year')
            || ! Schema::hasColumn('evaluation_submissions', 'academic_year_id')
        ) {
            return [];
        }

        $activeAcademicYearId = $activeCycle?->id ? (int) $activeCycle->id : null;
        $submittedRows = collect();
        $subjectRatingRows = collect();
        $peerRatingRows = collect();
        $periodIds = collect();
        $submissionIds = collect($teacher->evaluation_submission_ids ?? data_get($teacher->personal_info ?? [], 'evaluation_submission_ids', []))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $selects = ['id', 'academic_year_id', 'questionnaire_type_id', 'questionnaire_id', 'answers', 'created_at', 'updated_at'];

        foreach (['teacher_id', 'employee_id', 'subject_id', 'category', 'overall_average', 'submitted_at', 'is_other'] as $column) {
            if (Schema::hasColumn('evaluation_submissions', $column)) {
                $selects[] = $column;
            }
        }

        if ($submissionIds->isNotEmpty()) {
            $submittedQuery = DB::table('evaluation_submissions')
                ->select($selects)
                ->whereIn('id', $submissionIds->all())
                ->whereNotNull('academic_year_id')
                ->when($activeAcademicYearId, fn ($query) => $query->where('academic_year_id', '!=', $activeAcademicYearId));

            if (Schema::hasColumn('evaluation_submissions', 'submitted_at')) {
                $submittedQuery->orderByDesc('submitted_at');
            }

            $submittedRows = $submittedQuery->orderByDesc('created_at')->get();

            $periodIds = $periodIds->merge($submittedRows->pluck('academic_year_id'));
        }

        $subjectIds = collect($teacher->assigned_subject_ids ?? [])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if (
            $subjectIds->isNotEmpty()
            && Schema::hasColumn('evaluation_submissions', 'subject_id')
        ) {
            $subjectRatingRows = DB::table('evaluation_submissions')
                ->select($selects)
                ->whereIn('subject_id', $subjectIds->all())
                ->whereNotNull('academic_year_id')
                ->when($activeAcademicYearId, fn ($query) => $query->where('academic_year_id', '!=', $activeAcademicYearId))
                ->orderByDesc('created_at')
                ->get();

            $periodIds = $periodIds->merge($subjectRatingRows->pluck('academic_year_id'));
        }

        if (
            Schema::hasColumn('evaluation_submissions', 'teacher_id')
            && Schema::hasColumn('evaluation_submissions', 'subject_id')
        ) {
            $peerQuery = DB::table('evaluation_submissions')
                ->select($selects)
                ->where('teacher_id', (int) $teacher->id)
                ->whereNull('subject_id')
                ->whereNotNull('academic_year_id')
                ->when($activeAcademicYearId, fn ($query) => $query->where('academic_year_id', '!=', $activeAcademicYearId));

            if (Schema::hasColumn('evaluation_submissions', 'employee_id')) {
                $peerQuery->whereNull('employee_id');
            }

            if (Schema::hasColumn('evaluation_submissions', 'category')) {
                $peerQuery->where('category', 'peer_teacher');
            } elseif ($peerTypeId = $this->questionnaireTypeIdByKeyword('peer')) {
                $peerQuery->where('questionnaire_type_id', $peerTypeId);
            }

            $peerRatingRows = $peerQuery->orderByDesc('created_at')->get();
            $periodIds = $periodIds->merge($peerRatingRows->pluck('academic_year_id'));
        }

        $periods = DB::table('academic_year')
            ->whereIn('id', $periodIds->filter()->map(fn ($id) => (int) $id)->unique()->values()->all())
            ->orderByDesc('from_year')
            ->orderByDesc('to_year')
            ->orderByDesc('id')
            ->get()
            ->keyBy('id');

        if ($periods->isEmpty()) {
            return [];
        }

        $teacherNames = Teacher::query()
            ->whereIn('id', $submittedRows->pluck('teacher_id')->filter()->unique()->values()->all())
            ->get(['id', 'firstname', 'middlename', 'lastname', 'role'])
            ->keyBy('id');
        $employeeNames = Employee::query()
            ->whereIn('id', $submittedRows->pluck('employee_id')->filter()->unique()->values()->all())
            ->get(['id', 'firstname', 'middlename', 'lastname', 'role'])
            ->keyBy('id');
        $subjects = Subject::query()
            ->whereIn('id', $subjectRatingRows->pluck('subject_id')->filter()->unique()->values()->all())
            ->get(['id', 'code', 'name'])
            ->keyBy('id');
        $questionnaires = Schema::hasTable('questionnaires')
            ? DB::table('questionnaires')
                ->whereIn('id', $submittedRows->pluck('questionnaire_id')
                    ->merge($subjectRatingRows->pluck('questionnaire_id'))
                    ->merge($peerRatingRows->pluck('questionnaire_id'))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all())
                ->pluck('title', 'id')
            : collect();

        $emptyFolder = fn ($period) => [
            'key' => (string) $period->id,
            'label' => trim("{$period->from_year}-{$period->to_year} " . $this->semesterLabel($period->term ?? null)),
            'submitted' => [
                'peer_teacher' => [],
                'head_teacher' => [],
                'employee_evaluation' => [],
            ],
            'ratings' => [
                'subject' => [],
                'peer' => [],
            ],
        ];

        $folders = $periods->mapWithKeys(fn ($period) => [(int) $period->id => $emptyFolder($period)])->all();

        foreach ($submittedRows as $row) {
            $periodId = (int) $row->academic_year_id;

            if (! isset($folders[$periodId])) {
                continue;
            }

            $category = $row->category ?? null;

            if (! in_array($category, ['peer_teacher', 'head_teacher', 'employee_evaluation'], true)) {
                $category = $this->categoryFromSubmissionRow($row);
            }

            $target = $category === 'employee_evaluation'
                ? $employeeNames->get((int) ($row->employee_id ?? 0))
                : $teacherNames->get((int) ($row->teacher_id ?? 0));
            $average = $row->overall_average ?? $this->averageFromAnswers($row->answers ?? null);

            $folders[$periodId]['submitted'][$category][] = [
                'id' => (int) $row->id,
                'evaluatee_name' => $target?->full_name ?: 'Evaluation target',
                'role' => $target?->role ?? '',
                'questionnaire_title' => $questionnaires->get((int) ($row->questionnaire_id ?? 0), 'Questionnaire'),
                'rating' => $average,
                'percentage' => $average !== null ? round(((float) $average / 5) * 100, 2) : null,
                'submitted_at' => $row->submitted_at ?? $row->updated_at ?? $row->created_at,
            ];
        }

        $subjectRatingRows
            ->groupBy(fn ($row) => (int) $row->academic_year_id . ':' . (int) $row->subject_id)
            ->each(function (Collection $rows, string $key) use (&$folders, $subjects) {
                [$periodId, $subjectId] = array_map('intval', explode(':', $key));

                if (! isset($folders[$periodId])) {
                    return;
                }

                $ratings = $rows
                    ->map(fn ($row) => $this->averageFromAnswers($row->answers ?? null))
                    ->filter(fn ($rating) => $rating !== null);
                $average = $ratings->isNotEmpty() ? round($ratings->avg(), 2) : null;
                $subject = $subjects->get($subjectId);

                $folders[$periodId]['ratings']['subject'][] = [
                    'id' => $subjectId,
                    'subject' => $subject?->name ?? 'Subject',
                    'code' => $subject?->code ?? '',
                    'submission_count' => $rows->count(),
                    'rating' => $average,
                    'percentage' => $average !== null ? round(($average / 5) * 100, 2) : null,
                    'latest_submitted_at' => optional($rows->sortByDesc(fn ($row) => $row->submitted_at ?? $row->updated_at ?? $row->created_at)->first())->submitted_at
                        ?? optional($rows->sortByDesc(fn ($row) => $row->updated_at ?? $row->created_at)->first())->updated_at
                        ?? optional($rows->sortByDesc('created_at')->first())->created_at,
                ];
            });

        $peerRatingRows
            ->groupBy(fn ($row) => (int) $row->academic_year_id . ':' . ((bool) ($row->is_other ?? false) ? 'outside' : 'inside'))
            ->each(function (Collection $rows, string $key) use (&$folders) {
                [$periodId, $scope] = explode(':', $key);
                $periodId = (int) $periodId;

                if (! isset($folders[$periodId])) {
                    return;
                }

                $ratings = $rows
                    ->map(fn ($row) => $this->averageFromAnswers($row->answers ?? null))
                    ->filter(fn ($rating) => $rating !== null);
                $average = $ratings->isNotEmpty() ? round($ratings->avg(), 2) : null;

                $folders[$periodId]['ratings']['peer'][] = [
                    'id' => $scope,
                    'scope' => $scope === 'outside' ? 'Outside Faculty' : 'Inside Faculty',
                    'submission_count' => $rows->count(),
                    'rating' => $average,
                    'percentage' => $average !== null ? round(($average / 5) * 100, 2) : null,
                    'latest_submitted_at' => optional($rows->sortByDesc(fn ($row) => $row->submitted_at ?? $row->updated_at ?? $row->created_at)->first())->submitted_at
                        ?? optional($rows->sortByDesc(fn ($row) => $row->updated_at ?? $row->created_at)->first())->updated_at
                        ?? optional($rows->sortByDesc('created_at')->first())->created_at,
                ];
            });

        return array_values($folders);
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

    private function questionnaireTypeIdByKeyword(string $keyword): ?int
    {
        if (! Schema::hasTable('questionnaire_type')) {
            return null;
        }

        $keyword = strtolower($keyword);
        $row = DB::table('questionnaire_type')
            ->select('id')
            ->where('is_deleted', 0)
            ->where(function ($query) use ($keyword) {
                $query->whereRaw('LOWER(code) LIKE ?', ["%{$keyword}%"])
                    ->orWhereRaw('LOWER(name) LIKE ?', ["%{$keyword}%"]);
            })
            ->orderBy('id')
            ->first();

        return $row?->id ? (int) $row->id : null;
    }

    private function categoryFromSubmissionRow(object $row): string
    {
        if (! empty($row->employee_id)) {
            return 'employee_evaluation';
        }

        $typeId = (int) ($row->questionnaire_type_id ?? 0);

        if ($typeId && $typeId === $this->questionnaireTypeIdByKeyword('head')) {
            return 'head_teacher';
        }

        return 'peer_teacher';
    }

    private function questionnaireTypeIdForCategory(string $category): ?int
    {
        return match ($category) {
            'head_teacher' => $this->questionnaireTypeIdByKeyword('head'),
            'employee_evaluation' => $this->questionnaireTypeIdByKeyword('employee'),
            'teacher_subject', 'subject_teacher' => $this->questionnaireTypeIdByKeyword('subject'),
            default => $this->questionnaireTypeIdByKeyword('peer'),
        };
    }

    private function teacherSubmissionIds(Teacher $teacher): array
    {
        $submissionIds = $teacher->evaluation_submission_ids
            ?? data_get($teacher->personal_info ?? [], 'evaluation_submission_ids', []);

        return collect($submissionIds)
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function rememberTeacherSubmissionId(Teacher $teacher, int $submissionId): void
    {
        $submissionIds = collect($teacher->evaluation_submission_ids ?? data_get($teacher->personal_info ?? [], 'evaluation_submission_ids', []))
            ->map(fn ($id) => (int) $id)
            ->push($submissionId)
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (Schema::hasColumn('teacher', 'evaluation_submission_ids')) {
            $teacher->forceFill([
                'evaluation_submission_ids' => $submissionIds,
            ])->save();

            return;
        }

        $personalInfo = $teacher->personal_info ?? [];
        $personalInfo['evaluation_submission_ids'] = $submissionIds;

        $teacher->forceFill([
            'personal_info' => $personalInfo,
        ])->save();
    }

    private function isOtherPeerEvaluation(Teacher $teacher, Teacher $evaluatee): bool
    {
        if (! empty($teacher->program_id)) {
            return (int) ($evaluatee->program_id ?? 0) !== (int) $teacher->program_id;
        }

        if (! empty($teacher->strand_id)) {
            return (int) ($evaluatee->strand_id ?? 0) !== (int) $teacher->strand_id;
        }

        return false;
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
            $typeId = $this->questionnaireTypeIdForCategory($category);

            $submitted = empty($submissionIds)
                ? []
                : DB::table('evaluation_submissions')
                    ->whereIn('id', $submissionIds)
                    ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId))
                    ->when($typeId, fn ($query) => $query->where('questionnaire_type_id', $typeId))
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

        $targetLookup = collect($targets)
            ->mapWithKeys(fn ($target) => [
                ($target['category'] ?? 'peer_teacher') . ':' . (int) $target['id'] => (string) ($target['form_key'] ?? $target['id']),
            ]);
        $targetIds = collect($targets)
            ->reject(fn ($target) => ($target['category'] ?? null) === 'employee_evaluation')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->values();
        $employeeTargetIds = collect($targets)
            ->filter(fn ($target) => ($target['category'] ?? null) === 'employee_evaluation')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->values();

        if ($targetIds->isEmpty() && $employeeTargetIds->isEmpty()) {
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
                ->select('id', 'evaluatee_id', 'category', 'answers', 'comments', 'submitted_at', 'updated_at')
                ->where('evaluator_id', $teacher->id)
                ->where('evaluator_type', 'teacher')
                ->whereIn('category', collect($targets)->pluck('category')->filter()->unique()->values()->all())
                ->where('school_year', "{$cycle->from_year}-{$cycle->to_year}")
                ->whereIn('term', $terms)
                ->whereIn('evaluatee_id', $targetIds->merge($employeeTargetIds)->unique()->values()->all())
                ->orderByDesc('submitted_at')
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->get();
        } else {
            $submissionIds = $this->teacherSubmissionIds($teacher);

            if (empty($submissionIds)) {
                return [];
            }

            $hasTeacherId = Schema::hasColumn('evaluation_submissions', 'teacher_id');
            $hasEmployeeId = Schema::hasColumn('evaluation_submissions', 'employee_id');

            if ((! $hasTeacherId || $targetIds->isEmpty()) && (! $hasEmployeeId || $employeeTargetIds->isEmpty())) {
                return [];
            }

            $query = DB::table('evaluation_submissions')
                ->select(
                    'id',
                    'questionnaire_type_id',
                    'answers',
                    'comments',
                    'created_at',
                    'updated_at',
                    $hasTeacherId ? 'teacher_id' : DB::raw('NULL as teacher_id'),
                    $hasEmployeeId ? 'employee_id' : DB::raw('NULL as employee_id'),
                )
                ->whereIn('id', $submissionIds)
                ->where('academic_year_id', (int) $cycle->id);

            $query->where(function ($sub) use ($hasTeacherId, $hasEmployeeId, $targetIds, $employeeTargetIds) {
                if ($hasTeacherId && $targetIds->isNotEmpty()) {
                    $sub->orWhereIn('teacher_id', $targetIds->all());
                }

                if ($hasEmployeeId && $employeeTargetIds->isNotEmpty()) {
                    $sub->orWhereIn('employee_id', $employeeTargetIds->all());
                }
            });

            $rows = $query
                ->orderByDesc('updated_at')
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->get();
        }

        return $rows
            ->groupBy(function ($row) use ($hasLegacyEvaluatorColumns, $targetLookup) {
                $category = $hasLegacyEvaluatorColumns
                    ? ($row->category ?? 'peer_teacher')
                    : $this->categoryFromSubmissionRow($row);
                $targetId = (int) ($hasLegacyEvaluatorColumns ? $row->evaluatee_id : ($row->employee_id ?? $row->teacher_id));

                return $targetLookup[$category . ':' . $targetId] ?? (string) $targetId;
            })
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

            $formKey = (string) ($target['form_key'] ?? $target['id']);

            $forms[$formKey] = [
                'category' => $target['category'] ?? 'peer_teacher',
                'questionnaireId' => $questionnaireId ?: null,
                'questionnaireTitle' => $target['questionnaire_title'] ?? null,
                'submission' => $submittedForms[$formKey] ?? $submittedForms[(string) $target['id']] ?? null,
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

    private function branchEmployeesForTeacher(Teacher $teacher): array
    {
        if (! Schema::hasTable('employee')) {
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
            ->when($hasEmployeeQuestionnaireId, fn ($q) => $q
                ->leftJoin('questionnaires as qn', 'qn.id', '=', 'e.questionnaire_id')
                ->addSelect(
                    'e.questionnaire_id',
                    'qn.code as questionnaire_code',
                    'qn.title as questionnaire_title'
                ))
            ->where('e.branch_id', $teacher->branch_id)
            ->where('e.is_deleted', 0)
            ->where('e.is_activated', 1)
            ->orderBy('e.lastname')
            ->orderBy('e.firstname');

        if ($employeeDepartmentTable && $hasEmployeeDepartmentColumn) {
            $query
                ->leftJoin($employeeDepartmentTable . ' as ed', 'ed.id', '=', 'e.employee_department_id')
                ->addSelect(
                    'e.employee_department_id',
                    'ed.name as employee_department_name',
                    'ed.code as employee_department_code'
                );
        } else {
            $query
                ->addSelect(
                    DB::raw('NULL as employee_department_id'),
                    DB::raw('NULL as employee_department_name'),
                    DB::raw('NULL as employee_department_code')
                );
        }

        if (! $hasEmployeeQuestionnaireId) {
            $query->addSelect(
                DB::raw('NULL as questionnaire_id'),
                DB::raw('NULL as questionnaire_code'),
                DB::raw('NULL as questionnaire_title')
            );
        }

        $submittedEmployeeIds = [];

        if (Schema::hasTable('evaluation_submissions')) {
            $cycle = $this->activeCycle();
            $submissionIds = $this->teacherSubmissionIds($teacher);

            if ($cycle && !empty($submissionIds) && Schema::hasColumn('evaluation_submissions', 'employee_id')) {
                $submittedEmployeeIds = DB::table('evaluation_submissions')
                    ->whereIn('id', $submissionIds)
                    ->where('academic_year_id', (int) $cycle->id)
                    ->whereNotNull('employee_id')
                    ->pluck('employee_id')
                    ->map(fn ($id) => (int) $id)
                    ->all();
            } elseif (
                $cycle
                && Schema::hasColumn('evaluation_submissions', 'evaluator_id')
                && Schema::hasColumn('evaluation_submissions', 'evaluatee_id')
            ) {
                [$termA, $termB] = $this->termOptions($cycle->term ?? null);
                $submittedEmployeeIds = DB::table('evaluation_submissions')
                    ->where('evaluator_id', $teacher->id)
                    ->where('evaluator_type', 'teacher')
                    ->where('category', 'employee_evaluation')
                    ->where('school_year', "{$cycle->from_year}-{$cycle->to_year}")
                    ->whereIn('term', [$termA, $termB])
                    ->pluck('evaluatee_id')
                    ->map(fn ($id) => (int) $id)
                    ->all();
            }
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
                'done' => in_array((int) $employee->id, $submittedEmployeeIds, true),
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

        if ($category === 'employee_evaluation') {
            $evaluatee = Employee::query()
                ->where('id', $evaluateeId)
                ->where('branch_id', $teacher->branch_id)
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->first();
        } else {
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
        }

        if (! $evaluatee) {
            return redirect()->route('portal.teacher.dashboard')->with('error', match ($category) {
                'head_teacher' => 'School head not found in your assigned scope.',
                'employee_evaluation' => 'Employee not found in your assigned branch.',
                default => 'Co-teacher not found in your assigned scope.',
            });
        }

        $questionnaireId = $evaluatee->questionnaire_id ? (int) $evaluatee->questionnaire_id : null;
        $questions = $this->questionnaireQuestions($questionnaireId);

        if ($questions->isEmpty()) {
            return redirect()->route('portal.teacher.dashboard')
                ->with('error', $category === 'employee_evaluation'
                    ? 'No questionnaire is assigned to this employee yet.'
                    : 'No questionnaire is assigned to this faculty member yet.');
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
                'role' => $evaluatee->role ?? ($category === 'employee_evaluation' ? 'Employee' : 'Teacher'),
                'scope' => $category === 'employee_evaluation'
                    ? ''
                    : ($evaluatee->program?->name ?? $evaluatee->strand?->name ?? $evaluatee->department?->name ?? ''),
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
            'category' => 'required|in:peer_teacher,head_teacher,employee_evaluation',
            'evaluatee_id' => 'required|integer',
            'questionnaire_id' => 'nullable|integer',
            'academic_year_id' => 'required|integer',
            'answers' => 'required|array|min:1',
            'answers.*.question_id' => 'required|integer',
            'answers.*.rating' => 'required|integer|between:1,5',
            'comments' => 'nullable|string|max:2000',
        ]);

        if (! Schema::hasTable('evaluation_submissions')) {
            return back()->withErrors(['message' => 'Submissions storage is not available.']);
        }

        if ($data['category'] === 'employee_evaluation' && ! Schema::hasColumn('evaluation_submissions', 'employee_id')) {
            return back()->withErrors(['message' => 'Employee evaluation storage is not available. Please run the latest migrations.']);
        }

        $teacher = Teacher::query()
            ->where('id', $teacherId)
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->firstOrFail();

        if ($data['category'] === 'employee_evaluation') {
            $evaluatee = Employee::query()
                ->where('id', $data['evaluatee_id'])
                ->where('branch_id', $teacher->branch_id)
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->first();
        } else {
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
        }

        if (! $evaluatee) {
            return redirect()->route('portal.teacher.dashboard')->with('error', match ($data['category']) {
                'head_teacher' => 'School head not found in your assigned scope.',
                'employee_evaluation' => 'Employee not found in your assigned branch.',
                default => 'Co-teacher not found in your assigned scope.',
            });
        }

        $questionnaireId = $evaluatee->questionnaire_id ? (int) $evaluatee->questionnaire_id : null;
        $allowedQuestionIds = $this->questionnaireQuestions($questionnaireId)
            ->pluck('question_id')
            ->map(fn ($id) => (int) $id);

        if ($allowedQuestionIds->isEmpty()) {
            return redirect()->route('portal.teacher.dashboard')
                ->with('error', $data['category'] === 'employee_evaluation'
                    ? 'No questionnaire is assigned to this employee yet.'
                    : 'No questionnaire is assigned to this faculty member yet.');
        }

        $submittedQuestionIds = collect($data['answers'])
            ->pluck('question_id')
            ->map(fn ($id) => (int) $id);

        if ($submittedQuestionIds->diff($allowedQuestionIds)->isNotEmpty()) {
            return back()->withErrors(['message' => 'Submitted answers do not match the assigned questionnaire.']);
        }

        $hasLegacyEvaluatorColumns = Schema::hasColumn('evaluation_submissions', 'evaluator_id')
            && Schema::hasColumn('evaluation_submissions', 'evaluatee_id');

        if ($hasLegacyEvaluatorColumns) {
            $cycle = DB::table('academic_year')->where('id', $data['academic_year_id'])->first();
            $schoolYear = $cycle ? "{$cycle->from_year}-{$cycle->to_year}" : null;
            $terms = array_values(array_unique(array_filter([
                $cycle->term ?? null,
                ...$this->termOptions($cycle->term ?? null),
            ])));

            $already = DB::table('evaluation_submissions')
                ->where('evaluator_id', $teacherId)
                ->where('evaluator_type', 'teacher')
                ->where('evaluatee_id', $evaluatee->id)
                ->when($schoolYear, fn ($query) => $query->where('school_year', $schoolYear))
                ->whereIn('term', $terms)
                ->where('category', $data['category'])
                ->exists();
        } else {
            $submissionIds = $this->teacherSubmissionIds($teacher);

            if (empty($submissionIds)) {
                $already = false;
            } else {
                $alreadyQuery = DB::table('evaluation_submissions')
                    ->whereIn('id', $submissionIds)
                    ->where('academic_year_id', $data['academic_year_id'])
                    ->where('questionnaire_id', $questionnaireId);

                if ($data['category'] === 'employee_evaluation' && Schema::hasColumn('evaluation_submissions', 'employee_id')) {
                    $alreadyQuery->where('employee_id', $evaluatee->id);
                } elseif (Schema::hasColumn('evaluation_submissions', 'teacher_id')) {
                    $alreadyQuery->where('teacher_id', $evaluatee->id);
                }

                $already = $alreadyQuery->exists();
            }
        }

        if ($already) {
            return redirect()->route('portal.teacher.dashboard')->with('error', match ($data['category']) {
                'head_teacher' => 'You have already submitted this school head evaluation.',
                'employee_evaluation' => 'You have already submitted this employee evaluation.',
                default => 'You have already submitted this faculty evaluation.',
            });
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

        if (Schema::hasColumn('evaluation_submissions', 'category')) {
            $submissionPayload['category'] = $data['category'];
        }

        if ($data['category'] === 'employee_evaluation' && Schema::hasColumn('evaluation_submissions', 'employee_id')) {
            $submissionPayload['employee_id'] = $evaluatee->id;
        } elseif (Schema::hasColumn('evaluation_submissions', 'teacher_id')) {
            $submissionPayload['teacher_id'] = $evaluatee->id;
        }

        if (Schema::hasColumn('evaluation_submissions', 'is_other')) {
            $submissionPayload['is_other'] = $data['category'] === 'peer_teacher' && $evaluatee instanceof Teacher
                ? $this->isOtherPeerEvaluation($teacher, $evaluatee)
                : false;
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
                'evaluatee_type' => $data['category'] === 'employee_evaluation' ? 'employee' : 'teacher',
                'category' => $data['category'],
                'subject_section_id' => null,
                'school_year' => $schoolYear,
                'term' => $terms[0] ?? null,
                'overall_average' => $avg,
                'submitted_at' => now(),
            ];
        }

        $submissionId = (int) DB::table('evaluation_submissions')->insertGetId($submissionPayload);

        $this->rememberTeacherSubmissionId($teacher, $submissionId);

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
        } elseif ($data['category'] === 'employee_evaluation' && Schema::hasTable('ratings_employee')) {
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

        return redirect()->route('portal.teacher.dashboard')->with('success', match ($data['category']) {
            'head_teacher' => 'School head evaluation submitted. Thank you!',
            'employee_evaluation' => 'Employee evaluation submitted. Thank you!',
            default => 'Faculty evaluation submitted. Thank you!',
        });
    }

    public function dashboard(): Response
    {
        $employeeId = (int) session('client_id');
        $teacher = Teacher::with(['branch', 'department', 'program', 'strand'])->findOrFail($employeeId);

        $cycle = $this->activeCycle();
        $classes = [];
        $pendingTargets = [];
        $headTargets = [];
        $employeeTargets = [];
        $evaluationForms = [];
        $subjectRatings = [];
        $archiveFolders = [];
        $peerRatings = [
            'inside' => ['label' => 'Inside Faculty', 'submission_count' => 0, 'overall_rating' => null, 'overall_percentage' => null, 'questions' => []],
            'outside' => ['label' => 'Outside Faculty', 'submission_count' => 0, 'overall_rating' => null, 'overall_percentage' => null, 'questions' => []],
        ];

        if ($cycle) {
            [$termA, $termB] = $this->termOptions($cycle->term ?? null);
            $schoolYear = trim("{$cycle->from_year}-{$cycle->to_year}");
            $semesterLabel = $this->semesterLabel($cycle->term ?? null);

            $classes = $this->buildAssignedSubjectClasses($teacher, $semesterLabel, $schoolYear);

            if (empty($classes)) {
                $classes = array_merge(
                    $this->buildSubjectSectionClasses($employeeId, $schoolYear, [$termA, $termB]),
                    $this->buildLegacyEducationLevelClasses($teacher, $semesterLabel),
                );
            }

            $subjectRatings = $this->subjectRatingsForClasses($teacher, $classes, $cycle, $schoolYear, [$termA, $termB]);
            $peerRatings = $this->peerRatingsForTeacher($teacher, $cycle);

            $pendingTargets = $this->evaluationTargets($teacher, $schoolYear, [$termA, $termB], (int) $cycle->id, 'peer_teacher');
            $headTargets = $this->evaluationTargets($teacher, $schoolYear, [$termA, $termB], (int) $cycle->id, 'head_teacher');
            $employeeTargets = $this->branchEmployeesForTeacher($teacher);
            $allTargets = [...$pendingTargets, ...$headTargets, ...$employeeTargets];
            $submittedForms = $this->submittedFormsByTarget($teacher, $allTargets, $cycle);
            $evaluationForms = $this->evaluationFormsForTargets($allTargets, $cycle, $submittedForms);
        } else {
            $classes = $this->buildAssignedSubjectClasses($teacher, 'No active term')
                ?: $this->buildLegacyEducationLevelClasses($teacher, 'No active term');
        }

        usort($classes, fn (array $a, array $b) => [$a['course_name'], $a['section_name']] <=> [$b['course_name'], $b['section_name']]);
        $archiveFolders = $this->archiveFoldersForTeacher($teacher, $cycle);

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
            'subjectRatings' => $subjectRatings,
            'peerRatings' => $peerRatings,
            'pendingTargets' => $pendingTargets,
            'headTargets' => $headTargets,
            'employeeTargets' => $employeeTargets,
            'evaluationForms' => $evaluationForms,
            'archiveFolders' => $archiveFolders,
        ]);
    }
}
