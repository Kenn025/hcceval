<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class EvaluationSubmissionArchiveSeeder extends Seeder
{
    private const ARCHIVE_OPENED_AT = '2026-04-26 00:00:00';

    public function run(): void
    {
        if (
            ! Schema::hasTable('evaluation_submissions')
            || ! Schema::hasTable('academic_year')
            || ! DB::table('academic_year')->where('id', 1)->exists()
        ) {
            return;
        }

        $olderAcademicYearId = $this->ensureAcademicYear(2024, 2025, '1st Semester');
        $olderSecondSemesterAcademicYearId = $this->ensureAcademicYear(2024, 2025, '2nd Semester');
        $activeAcademicYearId = $this->activeAcademicYearId();

        $this->deleteExistingPreviewRows(array_filter([1, $olderAcademicYearId, $olderSecondSemesterAcademicYearId, $activeAcademicYearId]));
        $this->deleteExistingPeerRatingRows(array_filter([1, $olderAcademicYearId, $olderSecondSemesterAcademicYearId, $activeAcademicYearId]));

        $now = now();
        $submissionIdsByTeacher = [
            1 => [],
            23 => [],
        ];

        $submissionIdsByTeacher[1][] = $this->insertSubmission([
            'branch_id' => 2,
            'academic_year_id' => 1,
            'questionnaire_type_id' => 2,
            'questionnaire_id' => 3,
            'teacher_id' => 5,
            'category' => 'peer_teacher',
            'answers' => $this->answers([1 => 5, 6 => 4, 2 => 5, 4 => 4, 5 => 5]),
            'overall_average' => 4.60,
            'submitted_at' => $now->copy()->subDays(15),
            'created_at' => $now->copy()->subDays(15),
            'updated_at' => $now->copy()->subDays(15),
        ]);

        $submissionIdsByTeacher[1][] = $this->insertSubmission([
            'branch_id' => 2,
            'academic_year_id' => 1,
            'questionnaire_type_id' => 3,
            'questionnaire_id' => 5,
            'teacher_id' => 2,
            'category' => 'head_teacher',
            'answers' => $this->answers([1 => 4, 6 => 4, 2 => 5, 4 => 4, 5 => 4]),
            'overall_average' => 4.20,
            'submitted_at' => $now->copy()->subDays(12),
            'created_at' => $now->copy()->subDays(12),
            'updated_at' => $now->copy()->subDays(12),
        ]);

        $submissionIdsByTeacher[1][] = $this->insertSubmission([
            'branch_id' => 2,
            'academic_year_id' => 1,
            'questionnaire_type_id' => 4,
            'questionnaire_id' => 7,
            'employee_id' => 1,
            'category' => 'employee_evaluation',
            'answers' => $this->answers([1 => 5, 6 => 5, 2 => 4, 4 => 5, 5 => 4]),
            'overall_average' => 4.60,
            'submitted_at' => $now->copy()->subDays(10),
            'created_at' => $now->copy()->subDays(10),
            'updated_at' => $now->copy()->subDays(10),
        ]);

        $this->insertSubmission([
            'branch_id' => 2,
            'academic_year_id' => 1,
            'questionnaire_type_id' => 1,
            'questionnaire_id' => 1,
            'subject_id' => 1,
            'teacher_id' => 1,
            'category' => 'subject_teacher',
            'answers' => $this->answers([1 => 5, 6 => 4, 2 => 4, 4 => 5, 5 => 5]),
            'overall_average' => 4.60,
            'submitted_at' => $now->copy()->subDays(8),
            'created_at' => $now->copy()->subDays(8),
            'updated_at' => $now->copy()->subDays(8),
        ]);

        $this->insertSubmission([
            'branch_id' => 2,
            'academic_year_id' => 1,
            'questionnaire_type_id' => 1,
            'questionnaire_id' => 1,
            'subject_id' => 2,
            'teacher_id' => 1,
            'category' => 'subject_teacher',
            'answers' => $this->answers([1 => 4, 6 => 4, 2 => 4, 4 => 5, 5 => 4]),
            'overall_average' => 4.20,
            'submitted_at' => $now->copy()->subDays(7),
            'created_at' => $now->copy()->subDays(7),
            'updated_at' => $now->copy()->subDays(7),
        ]);

        $this->insertSubmission([
            'branch_id' => 2,
            'academic_year_id' => 1,
            'questionnaire_type_id' => 2,
            'questionnaire_id' => 3,
            'teacher_id' => 1,
            'category' => 'peer_teacher',
            'is_other' => false,
            'answers' => $this->answers([1 => 5, 6 => 5, 2 => 5, 4 => 4, 5 => 5]),
            'overall_average' => 4.80,
            'submitted_at' => $now->copy()->subDays(5),
            'created_at' => $now->copy()->subDays(5),
            'updated_at' => $now->copy()->subDays(5),
        ]);

        $submissionIdsByTeacher[23][] = $this->insertSubmission([
            'branch_id' => 3,
            'academic_year_id' => 1,
            'questionnaire_type_id' => 2,
            'questionnaire_id' => 4,
            'teacher_id' => 21,
            'category' => 'peer_teacher',
            'answers' => $this->answers([1 => 4, 6 => 5, 2 => 5, 5 => 4]),
            'overall_average' => 4.50,
            'submitted_at' => $now->copy()->subDays(14),
            'created_at' => $now->copy()->subDays(14),
            'updated_at' => $now->copy()->subDays(14),
        ]);

        $submissionIdsByTeacher[23][] = $this->insertSubmission([
            'branch_id' => 3,
            'academic_year_id' => 1,
            'questionnaire_type_id' => 3,
            'questionnaire_id' => 6,
            'teacher_id' => 19,
            'category' => 'head_teacher',
            'answers' => $this->answers([1 => 5, 6 => 4, 2 => 5, 4 => 4, 5 => 5]),
            'overall_average' => 4.60,
            'submitted_at' => $now->copy()->subDays(11),
            'created_at' => $now->copy()->subDays(11),
            'updated_at' => $now->copy()->subDays(11),
        ]);

        $submissionIdsByTeacher[23][] = $this->insertSubmission([
            'branch_id' => 3,
            'academic_year_id' => 1,
            'questionnaire_type_id' => 4,
            'questionnaire_id' => 8,
            'employee_id' => 5,
            'category' => 'employee_evaluation',
            'answers' => $this->answers([1 => 4, 6 => 4, 2 => 5, 4 => 4, 5 => 5]),
            'overall_average' => 4.40,
            'submitted_at' => $now->copy()->subDays(9),
            'created_at' => $now->copy()->subDays(9),
            'updated_at' => $now->copy()->subDays(9),
        ]);

        $this->insertSubmission([
            'branch_id' => 3,
            'academic_year_id' => 1,
            'questionnaire_type_id' => 1,
            'questionnaire_id' => 2,
            'subject_id' => 13,
            'teacher_id' => 23,
            'category' => 'subject_teacher',
            'answers' => $this->answers([1 => 5, 6 => 5, 2 => 4, 5 => 5]),
            'overall_average' => 4.75,
            'submitted_at' => $now->copy()->subDays(6),
            'created_at' => $now->copy()->subDays(6),
            'updated_at' => $now->copy()->subDays(6),
        ]);

        $this->insertSubmission([
            'branch_id' => 3,
            'academic_year_id' => 1,
            'questionnaire_type_id' => 2,
            'questionnaire_id' => 4,
            'teacher_id' => 23,
            'category' => 'peer_teacher',
            'is_other' => false,
            'answers' => $this->answers([1 => 5, 6 => 4, 2 => 5, 5 => 5]),
            'overall_average' => 4.75,
            'submitted_at' => $now->copy()->subDays(4),
            'created_at' => $now->copy()->subDays(4),
            'updated_at' => $now->copy()->subDays(4),
        ]);

        foreach ($submissionIdsByTeacher as $teacherId => $submissionIds) {
            $this->updateTeacherPreviewLinks($teacherId, array_filter($submissionIds));
        }

        $olderSubmissionIdsByTeacher = [
            1 => [],
            23 => [],
        ];

        $olderSubmissionIdsByTeacher[1][] = $this->insertSubmission([
            'branch_id' => 2,
            'academic_year_id' => $olderAcademicYearId,
            'questionnaire_type_id' => 2,
            'questionnaire_id' => 3,
            'teacher_id' => 6,
            'category' => 'peer_teacher',
            'answers' => $this->answers([1 => 4, 6 => 4, 2 => 5, 4 => 4, 5 => 4]),
            'overall_average' => 4.20,
            'submitted_at' => $now->copy()->subYear()->subDays(18),
            'created_at' => $now->copy()->subYear()->subDays(18),
            'updated_at' => $now->copy()->subYear()->subDays(18),
        ]);

        $olderSubmissionIdsByTeacher[1][] = $this->insertSubmission([
            'branch_id' => 2,
            'academic_year_id' => $olderAcademicYearId,
            'questionnaire_type_id' => 3,
            'questionnaire_id' => 5,
            'teacher_id' => 3,
            'category' => 'head_teacher',
            'answers' => $this->answers([1 => 5, 6 => 4, 2 => 4, 4 => 4, 5 => 5]),
            'overall_average' => 4.40,
            'submitted_at' => $now->copy()->subYear()->subDays(16),
            'created_at' => $now->copy()->subYear()->subDays(16),
            'updated_at' => $now->copy()->subYear()->subDays(16),
        ]);

        $olderSubmissionIdsByTeacher[1][] = $this->insertSubmission([
            'branch_id' => 2,
            'academic_year_id' => $olderAcademicYearId,
            'questionnaire_type_id' => 4,
            'questionnaire_id' => 7,
            'employee_id' => 2,
            'category' => 'employee_evaluation',
            'answers' => $this->answers([1 => 4, 6 => 5, 2 => 4, 4 => 4, 5 => 4]),
            'overall_average' => 4.20,
            'submitted_at' => $now->copy()->subYear()->subDays(14),
            'created_at' => $now->copy()->subYear()->subDays(14),
            'updated_at' => $now->copy()->subYear()->subDays(14),
        ]);

        $this->insertSubmission([
            'branch_id' => 2,
            'academic_year_id' => $olderAcademicYearId,
            'questionnaire_type_id' => 1,
            'questionnaire_id' => 1,
            'subject_id' => 1,
            'teacher_id' => 1,
            'category' => 'subject_teacher',
            'answers' => $this->answers([1 => 4, 6 => 4, 2 => 4, 4 => 5, 5 => 4]),
            'overall_average' => 4.20,
            'submitted_at' => $now->copy()->subYear()->subDays(9),
            'created_at' => $now->copy()->subYear()->subDays(9),
            'updated_at' => $now->copy()->subYear()->subDays(9),
        ]);

        $this->insertSubmission([
            'branch_id' => 2,
            'academic_year_id' => $olderAcademicYearId,
            'questionnaire_type_id' => 2,
            'questionnaire_id' => 3,
            'teacher_id' => 1,
            'category' => 'peer_teacher',
            'is_other' => true,
            'answers' => $this->answers([1 => 4, 6 => 5, 2 => 4, 4 => 5, 5 => 4]),
            'overall_average' => 4.40,
            'submitted_at' => $now->copy()->subYear()->subDays(6),
            'created_at' => $now->copy()->subYear()->subDays(6),
            'updated_at' => $now->copy()->subYear()->subDays(6),
        ]);

        $olderSubmissionIdsByTeacher[23][] = $this->insertSubmission([
            'branch_id' => 3,
            'academic_year_id' => $olderAcademicYearId,
            'questionnaire_type_id' => 2,
            'questionnaire_id' => 4,
            'teacher_id' => 22,
            'category' => 'peer_teacher',
            'answers' => $this->answers([1 => 5, 6 => 4, 2 => 4, 5 => 4]),
            'overall_average' => 4.25,
            'submitted_at' => $now->copy()->subYear()->subDays(13),
            'created_at' => $now->copy()->subYear()->subDays(13),
            'updated_at' => $now->copy()->subYear()->subDays(13),
        ]);

        $olderSubmissionIdsByTeacher[23][] = $this->insertSubmission([
            'branch_id' => 3,
            'academic_year_id' => $olderAcademicYearId,
            'questionnaire_type_id' => 3,
            'questionnaire_id' => 6,
            'teacher_id' => 19,
            'category' => 'head_teacher',
            'answers' => $this->answers([1 => 4, 6 => 5, 2 => 5, 4 => 4, 5 => 4]),
            'overall_average' => 4.40,
            'submitted_at' => $now->copy()->subYear()->subDays(11),
            'created_at' => $now->copy()->subYear()->subDays(11),
            'updated_at' => $now->copy()->subYear()->subDays(11),
        ]);

        $this->insertSubmission([
            'branch_id' => 3,
            'academic_year_id' => $olderAcademicYearId,
            'questionnaire_type_id' => 1,
            'questionnaire_id' => 2,
            'subject_id' => 13,
            'teacher_id' => 23,
            'category' => 'subject_teacher',
            'answers' => $this->answers([1 => 4, 6 => 4, 2 => 5, 5 => 4]),
            'overall_average' => 4.25,
            'submitted_at' => $now->copy()->subYear()->subDays(8),
            'created_at' => $now->copy()->subYear()->subDays(8),
            'updated_at' => $now->copy()->subYear()->subDays(8),
        ]);

        $this->insertSubmission([
            'branch_id' => 3,
            'academic_year_id' => $olderAcademicYearId,
            'questionnaire_type_id' => 2,
            'questionnaire_id' => 4,
            'teacher_id' => 23,
            'category' => 'peer_teacher',
            'is_other' => true,
            'answers' => $this->answers([1 => 4, 6 => 4, 2 => 5, 5 => 5]),
            'overall_average' => 4.50,
            'submitted_at' => $now->copy()->subYear()->subDays(5),
            'created_at' => $now->copy()->subYear()->subDays(5),
            'updated_at' => $now->copy()->subYear()->subDays(5),
        ]);

        foreach ($olderSubmissionIdsByTeacher as $teacherId => $submissionIds) {
            $this->updateTeacherPreviewLinks($teacherId, array_filter($submissionIds));
        }

        $this->seedMultipageRatingFolderPreview($olderAcademicYearId, $now);
        $this->seedStudentArchiveOverview(12, 1, $now);
        $this->seedStudentArchiveOverview(12, $olderSecondSemesterAcademicYearId, $now->copy()->subMonths(5));
        $this->seedEmployeeArchiveOverview(1, 1, $now);
        $this->seedEmployeeArchiveOverview(1, $olderSecondSemesterAcademicYearId, $now->copy()->subMonths(5));

        if ($activeAcademicYearId) {
            $this->seedActivePeerSubmissions($activeAcademicYearId, $now);
            $this->seedActiveSubjectRatingPreview($activeAcademicYearId, $now);
        }

        $this->seedPeerRatings(1, $olderAcademicYearId, $activeAcademicYearId);
        $this->syncAcademicYearSummaries(array_filter([1, $olderAcademicYearId, $olderSecondSemesterAcademicYearId, $activeAcademicYearId]));
    }

    private function insertSubmission(array $payload): ?int
    {
        $payload['comments'] = json_encode([
            'text' => 'Archive preview seed record.',
            'seed' => 'archive_preview',
        ]);

        $columns = Schema::getColumnListing('evaluation_submissions');
        $payload = array_intersect_key($payload, array_flip($columns));

        if (! array_key_exists('answers', $payload)) {
            return null;
        }

        return (int) DB::table('evaluation_submissions')->insertGetId($payload);
    }

    private function answers(array $ratingsByQuestionId): string
    {
        return json_encode(collect($ratingsByQuestionId)
            ->map(fn (int $rating, int $questionId) => [
                'question_id' => $questionId,
                'rating' => $rating,
            ])
            ->values()
            ->all());
    }

    private function ensureAcademicYear(int $fromYear, int $toYear, string $term): int
    {
        $existing = DB::table('academic_year')
            ->where('from_year', $fromYear)
            ->where('to_year', $toYear)
            ->where('term', $term)
            ->first(['id']);

        if ($existing) {
            $updates = [
                'created_at' => self::ARCHIVE_OPENED_AT,
                'updated_at' => self::ARCHIVE_OPENED_AT,
            ];

            if (Schema::hasColumns('academic_year', ['date_opened', 'date_closed'])) {
                $updates['date_opened'] = self::ARCHIVE_OPENED_AT;
                $updates['date_closed'] = null;
            }

            DB::table('academic_year')->where('id', $existing->id)->update($updates);

            return (int) $existing->id;
        }

        $payload = [
            'from_year' => $fromYear,
            'to_year' => $toYear,
            'term' => $term,
            'is_activated' => 0,
            'is_deleted' => 0,
            'created_at' => self::ARCHIVE_OPENED_AT,
            'updated_at' => self::ARCHIVE_OPENED_AT,
        ];

        if (Schema::hasColumns('academic_year', ['date_opened', 'date_closed'])) {
            $payload['date_opened'] = self::ARCHIVE_OPENED_AT;
            $payload['date_closed'] = null;
        }

        return (int) DB::table('academic_year')->insertGetId($payload);
    }

    private function syncAcademicYearSummaries(array $academicYearIds): void
    {
        if (! Schema::hasColumns('academic_year', [
            'total_assigned_questions',
            'total_evaluation_submitted',
            'date_opened',
            'date_closed',
        ])) {
            return;
        }

        $questionTotals = $this->questionTotalsByAcademicYear();
        $submissionStats = $this->submissionStatsByAcademicYear();

        foreach ($academicYearIds as $academicYearId) {
            $stats = $submissionStats[(int) $academicYearId] ?? ['submissions' => 0, 'submitted_questions' => 0];

            DB::table('academic_year')->where('id', $academicYearId)->update([
                'total_assigned_questions' => (int) ($questionTotals[(int) $academicYearId] ?? 0),
                'total_evaluation_submitted' => (int) $stats['submissions'],
            ]);
        }
    }

    private function submissionStatsByAcademicYear(): array
    {
        return DB::table('evaluation_submissions')
            ->select('academic_year_id', 'answers')
            ->whereNotNull('academic_year_id')
            ->get()
            ->groupBy('academic_year_id')
            ->map(function ($rows) {
                return [
                    'submissions' => $rows->count(),
                    'submitted_questions' => $rows->sum(function (object $row) {
                        $answers = json_decode((string) $row->answers, true);

                        return is_array($answers) ? count($answers) : 0;
                    }),
                ];
            })
            ->all();
    }

    private function questionTotalsByAcademicYear(): array
    {
        $questionnaireQuestionCounts = DB::table('questionnaires')
            ->select('id', 'items')
            ->get()
            ->mapWithKeys(fn (object $questionnaire) => [
                (int) $questionnaire->id => $this->countQuestionnaireQuestions($questionnaire->items),
            ]);

        return DB::table('questionnaire_distribution')
            ->select('academic_year_id', 'questionnaire_id')
            ->where('is_deleted', 0)
            ->whereNotNull('academic_year_id')
            ->get()
            ->groupBy('academic_year_id')
            ->map(fn ($rows) => $rows->sum(
                fn (object $row) => (int) ($questionnaireQuestionCounts[(int) $row->questionnaire_id] ?? 0)
            ))
            ->all();
    }

    private function countQuestionnaireQuestions(?string $items): int
    {
        $payload = json_decode((string) $items, true);

        if (! is_array($payload)) {
            return 0;
        }

        $scaleQuestions = collect($payload['scale_questions'] ?? [])
            ->flatMap(fn ($group) => $group['questions'] ?? [])
            ->map(fn ($question) => (int) ($question['question_id'] ?? $question))
            ->filter();

        $commentQuestions = collect(data_get($payload, 'comment_section.questions', []))
            ->map(fn ($question) => (int) ($question['question_id'] ?? $question))
            ->filter();

        return $scaleQuestions->merge($commentQuestions)->unique()->count();
    }

    private function activeAcademicYearId(): ?int
    {
        return DB::table('academic_year')
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->orderByDesc('from_year')
            ->orderByDesc('to_year')
            ->orderByDesc('id')
            ->value('id');
    }

    private function deleteExistingPreviewRows(array $academicYearIds): void
    {
        $ids = DB::table('evaluation_submissions')
            ->whereIn('academic_year_id', $academicYearIds)
            ->get(['id', 'comments'])
            ->filter(function (object $row) {
                $comments = json_decode((string) $row->comments, true);

                return ($comments['seed'] ?? null) === 'archive_preview';
            })
            ->pluck('id')
            ->all();

        if ($ids !== []) {
            DB::table('evaluation_submissions')->whereIn('id', $ids)->delete();
        }
    }

    private function deleteExistingPeerRatingRows(array $academicYearIds): void
    {
        if (! Schema::hasTable('ratings_peer')) {
            return;
        }

        $ids = DB::table('ratings_peer')
            ->whereIn('academic_year_id', $academicYearIds)
            ->get(['id', 'comments'])
            ->filter(function (object $row) {
                $comments = json_decode((string) $row->comments, true);

                return ($comments['seed'] ?? null) === 'archive_preview';
            })
            ->pluck('id')
            ->all();

        if ($ids !== []) {
            DB::table('ratings_peer')->whereIn('id', $ids)->delete();
        }
    }

    private function seedActivePeerSubmissions(int $activeAcademicYearId, mixed $now): void
    {
        foreach ([
            [
                'branch_id' => 2,
                'teacher_id' => 1,
                'questionnaire_id' => 3,
                'is_other' => false,
                'answers' => [1 => 5, 6 => 5, 2 => 5, 4 => 4, 5 => 5],
                'overall_average' => 4.80,
                'submitted_at' => $now->copy()->subHours(4),
            ],
            [
                'branch_id' => 2,
                'teacher_id' => 1,
                'questionnaire_id' => 3,
                'is_other' => true,
                'answers' => [1 => 5, 6 => 4, 2 => 5, 4 => 5, 5 => 4],
                'overall_average' => 4.60,
                'submitted_at' => $now->copy()->subHours(3),
            ],
            [
                'branch_id' => 3,
                'teacher_id' => 23,
                'questionnaire_id' => 4,
                'is_other' => false,
                'answers' => [1 => 5, 6 => 4, 2 => 5, 5 => 5],
                'overall_average' => 4.75,
                'submitted_at' => $now->copy()->subHours(2),
            ],
            [
                'branch_id' => 3,
                'teacher_id' => 23,
                'questionnaire_id' => 4,
                'is_other' => true,
                'answers' => [1 => 4, 6 => 5, 2 => 5, 5 => 4],
                'overall_average' => 4.50,
                'submitted_at' => $now->copy()->subHour(),
            ],
        ] as $row) {
            $this->insertSubmission([
                'branch_id' => $row['branch_id'],
                'academic_year_id' => $activeAcademicYearId,
                'questionnaire_type_id' => 2,
                'questionnaire_id' => $row['questionnaire_id'],
                'teacher_id' => $row['teacher_id'],
                'category' => 'peer_teacher',
                'is_other' => $row['is_other'],
                'answers' => $this->answers($row['answers']),
                'overall_average' => $row['overall_average'],
                'submitted_at' => $row['submitted_at'],
                'created_at' => $row['submitted_at'],
                'updated_at' => $row['submitted_at'],
            ]);
        }
    }

    private function seedPeerRatings(int $currentAcademicYearId, int $olderAcademicYearId, ?int $activeAcademicYearId): void
    {
        if (! Schema::hasTable('ratings_peer')) {
            return;
        }

        $now = now();
        $rows = [
            [
                'academic_year_id' => $currentAcademicYearId,
                'teacher_id' => 1,
                'submission_count' => 4,
                'item_ratings' => [1 => 4.80, 2 => 4.70, 4 => 4.60, 5 => 4.75, 6 => 4.85],
                'overall' => 4.74,
                'created_at' => $now->copy()->subDays(5),
            ],
            [
                'academic_year_id' => $olderAcademicYearId,
                'teacher_id' => 1,
                'submission_count' => 3,
                'item_ratings' => [1 => 4.40, 2 => 4.30, 4 => 4.45, 5 => 4.35, 6 => 4.50],
                'overall' => 4.40,
                'created_at' => $now->copy()->subYear()->subDays(6),
            ],
            [
                'academic_year_id' => $currentAcademicYearId,
                'teacher_id' => 23,
                'submission_count' => 5,
                'item_ratings' => [1 => 4.75, 2 => 4.70, 5 => 4.85, 6 => 4.65],
                'overall' => 4.74,
                'created_at' => $now->copy()->subDays(4),
            ],
            [
                'academic_year_id' => $olderAcademicYearId,
                'teacher_id' => 23,
                'submission_count' => 3,
                'item_ratings' => [1 => 4.35, 2 => 4.50, 5 => 4.45, 6 => 4.30],
                'overall' => 4.40,
                'created_at' => $now->copy()->subYear()->subDays(5),
            ],
        ];

        if ($activeAcademicYearId) {
            $rows = array_merge($rows, [
                [
                    'academic_year_id' => $activeAcademicYearId,
                    'teacher_id' => 1,
                    'submission_count' => 2,
                    'item_ratings' => [1 => 4.90, 2 => 4.80, 4 => 4.75, 5 => 4.85, 6 => 4.90],
                    'overall' => 4.84,
                    'created_at' => $now->copy()->subHours(3),
                    'is_archived' => 0,
                ],
                [
                    'academic_year_id' => $activeAcademicYearId,
                    'teacher_id' => 23,
                    'submission_count' => 2,
                    'item_ratings' => [1 => 4.70, 2 => 4.80, 5 => 4.75, 6 => 4.65],
                    'overall' => 4.73,
                    'created_at' => $now->copy()->subHours(2),
                    'is_archived' => 0,
                ],
            ]);
        }

        foreach ($rows as $rating) {
            $this->insertPeerRating($rating);
        }
    }

    private function seedStudentArchiveOverview(int $studentId, int $academicYearId, mixed $now): void
    {
        if (! Schema::hasTable('student') || ! DB::table('student')->where('id', $studentId)->exists()) {
            return;
        }

        $rows = [
            [
                'branch_id' => 3,
                'academic_year_id' => $academicYearId,
                'questionnaire_type_id' => 1,
                'questionnaire_id' => 2,
                'subject_id' => 14,
                'teacher_id' => 20,
                'answers' => [1 => 5, 6 => 5, 2 => 4, 5 => 5],
                'submitted_at' => $now->copy()->subMonths(4)->subDays(5),
            ],
            [
                'branch_id' => 3,
                'academic_year_id' => $academicYearId,
                'questionnaire_type_id' => 3,
                'questionnaire_id' => 6,
                'teacher_id' => 19,
                'answers' => [1 => 4, 6 => 5, 2 => 5, 4 => 4, 5 => 5],
                'submitted_at' => $now->copy()->subMonths(4)->subDays(3),
            ],
            [
                'branch_id' => 3,
                'academic_year_id' => $academicYearId,
                'questionnaire_type_id' => 4,
                'questionnaire_id' => 8,
                'employee_id' => 5,
                'answers' => [1 => 5, 6 => 4, 2 => 4, 4 => 5, 5 => 4],
                'submitted_at' => $now->copy()->subMonths(4)->subDay(),
            ],
        ];
        $submissionIds = [];

        foreach ($rows as $row) {
            $ratings = $row['answers'];
            $average = round(array_sum($ratings) / count($ratings), 2);
            $submittedAt = $row['submitted_at'];
            unset($row['submitted_at'], $row['answers']);

            $submissionIds[] = $this->insertSubmission(array_merge($row, [
                'answers' => $this->answers($ratings),
                'overall_average' => $average,
                'submitted_at' => $submittedAt,
                'created_at' => $submittedAt,
                'updated_at' => $submittedAt,
            ]));
        }

        $student = DB::table('student')->where('id', $studentId)->first();
        $existingIds = json_decode((string) ($student->evaluation_submission_ids ?? '[]'), true) ?: [];

        DB::table('student')->where('id', $studentId)->update([
            'evaluation_submission_ids' => json_encode(collect($existingIds)
                ->merge($submissionIds)
                ->map(fn ($id) => (int) $id)
                ->filter()
                ->unique()
                ->values()
                ->all()),
        ]);
    }

    private function seedEmployeeArchiveOverview(int $employeeId, int $academicYearId, mixed $now): void
    {
        if (! Schema::hasTable('employee') || ! DB::table('employee')->where('id', $employeeId)->exists()) {
            return;
        }

        $rows = [
            [
                'branch_id' => 2,
                'academic_year_id' => $academicYearId,
                'questionnaire_type_id' => 4,
                'questionnaire_id' => 7,
                'employee_id' => $employeeId,
                'category' => 'employee_evaluation',
                'answers' => [1 => 5, 6 => 4, 2 => 5, 4 => 4, 5 => 5],
                'submitted_at' => $now->copy()->subMonths(3)->subDays(8),
            ],
            [
                'branch_id' => 2,
                'academic_year_id' => $academicYearId,
                'questionnaire_type_id' => 4,
                'questionnaire_id' => 7,
                'employee_id' => $employeeId,
                'category' => 'employee_evaluation',
                'answers' => [1 => 4, 6 => 5, 2 => 4, 4 => 5, 5 => 4],
                'submitted_at' => $now->copy()->subMonths(3)->subDays(4),
            ],
            [
                'branch_id' => 2,
                'academic_year_id' => $academicYearId,
                'questionnaire_type_id' => 4,
                'questionnaire_id' => 7,
                'employee_id' => $employeeId,
                'category' => 'employee_evaluation',
                'answers' => [1 => 5, 6 => 5, 2 => 4, 4 => 4, 5 => 5],
                'submitted_at' => $now->copy()->subMonths(3)->subDay(),
            ],
        ];

        foreach ($rows as $row) {
            $ratings = $row['answers'];
            $average = round(array_sum($ratings) / count($ratings), 2);
            $submittedAt = $row['submitted_at'];
            unset($row['submitted_at'], $row['answers']);

            $this->insertSubmission(array_merge($row, [
                'answers' => $this->answers($ratings),
                'overall_average' => $average,
                'submitted_at' => $submittedAt,
                'created_at' => $submittedAt,
                'updated_at' => $submittedAt,
            ]));
        }
    }

    private function seedMultipageRatingFolderPreview(int $academicYearId, mixed $now): void
    {
        $subjects = [
            3 => [1 => 5, 6 => 5, 2 => 4, 4 => 5, 5 => 4],
            4 => [1 => 4, 6 => 5, 2 => 5, 4 => 4, 5 => 5],
            5 => [1 => 5, 6 => 4, 2 => 5, 4 => 5, 5 => 5],
            6 => [1 => 4, 6 => 4, 2 => 5, 4 => 5, 5 => 4],
            7 => [1 => 5, 6 => 5, 2 => 5, 4 => 4, 5 => 4],
            8 => [1 => 4, 6 => 5, 2 => 4, 4 => 5, 5 => 5],
            9 => [1 => 5, 6 => 4, 2 => 5, 4 => 4, 5 => 5],
            10 => [1 => 4, 6 => 5, 2 => 5, 4 => 5, 5 => 4],
            11 => [1 => 5, 6 => 5, 2 => 4, 4 => 4, 5 => 5],
            12 => [1 => 4, 6 => 4, 2 => 5, 4 => 5, 5 => 5],
        ];

        foreach ($subjects as $index => $ratings) {
            $average = round(array_sum($ratings) / count($ratings), 2);

            $this->insertSubmission([
                'branch_id' => $index >= 7 ? 3 : 2,
                'academic_year_id' => $academicYearId,
                'questionnaire_type_id' => 1,
                'questionnaire_id' => $index >= 7 ? 2 : 1,
                'subject_id' => $index,
                'teacher_id' => 1,
                'category' => 'subject_teacher',
                'answers' => $this->answers($ratings),
                'overall_average' => $average,
                'submitted_at' => $now->copy()->subYear()->subDays(30 - $index),
                'created_at' => $now->copy()->subYear()->subDays(30 - $index),
                'updated_at' => $now->copy()->subYear()->subDays(30 - $index),
            ]);
        }
    }

    private function seedActiveSubjectRatingPreview(int $academicYearId, mixed $now): void
    {
        $subjects = [
            13 => [1 => 5, 6 => 5, 2 => 4, 5 => 5],
            14 => [1 => 4, 6 => 5, 2 => 5, 5 => 4],
            15 => [1 => 5, 6 => 4, 2 => 5, 5 => 5],
            16 => [1 => 4, 6 => 4, 2 => 5, 5 => 5],
            21 => [1 => 5, 6 => 5, 2 => 5, 5 => 4],
            22 => [1 => 4, 6 => 5, 2 => 4, 5 => 5],
            25 => [1 => 5, 6 => 4, 2 => 5, 5 => 4],
            26 => [1 => 4, 6 => 5, 2 => 5, 5 => 5],
        ];

        foreach ($subjects as $subjectId => $ratings) {
            $average = round(array_sum($ratings) / count($ratings), 2);

            $this->insertSubmission([
                'branch_id' => 3,
                'academic_year_id' => $academicYearId,
                'questionnaire_type_id' => 1,
                'questionnaire_id' => 2,
                'subject_id' => $subjectId,
                'teacher_id' => 23,
                'category' => 'subject_teacher',
                'answers' => $this->answers($ratings),
                'overall_average' => $average,
                'submitted_at' => $now->copy()->subHours(12 - ($subjectId % 8)),
                'created_at' => $now->copy()->subHours(12 - ($subjectId % 8)),
                'updated_at' => $now->copy()->subHours(12 - ($subjectId % 8)),
            ]);
        }

        $this->updateTeacherPreviewLinks(23, []);
    }

    private function insertPeerRating(array $rating): void
    {
        $payload = [
            'academic_year_id' => $rating['academic_year_id'],
            'teacher_id' => $rating['teacher_id'],
            'submission_count' => $rating['submission_count'],
            'item_ratings' => json_encode($rating['item_ratings']),
            'comments' => json_encode([
                'text' => 'Archive preview peer rating.',
                'seed' => 'archive_preview',
            ]),
            'overall_ratings' => json_encode(['average' => $rating['overall']]),
            'created_at' => $rating['created_at'],
            'updated_at' => $rating['created_at'],
        ];

        if (Schema::hasColumn('ratings_peer', 'is_archived')) {
            $payload['is_archived'] = $rating['is_archived'] ?? 1;
        }

        if (Schema::hasColumn('ratings_peer', 'archived_at') && ($rating['is_archived'] ?? 1)) {
            $payload['archived_at'] = $rating['created_at'];
        }

        $columns = Schema::getColumnListing('ratings_peer');
        $payload = array_intersect_key($payload, array_flip($columns));

        DB::table('ratings_peer')->insert($payload);
    }

    private function updateTeacherPreviewLinks(int $teacherId, array $submissionIds): void
    {
        if (! Schema::hasTable('teacher') || ! DB::table('teacher')->where('id', $teacherId)->exists()) {
            return;
        }

        $teacher = DB::table('teacher')->where('id', $teacherId)->first();
        $updates = [];

        if (Schema::hasColumn('teacher', 'evaluation_submission_ids')) {
            $existingIds = json_decode((string) ($teacher->evaluation_submission_ids ?? '[]'), true) ?: [];
            $updates['evaluation_submission_ids'] = json_encode(collect($existingIds)
                ->merge($submissionIds)
                ->map(fn ($id) => (int) $id)
                ->filter()
                ->unique()
                ->values()
                ->all());
        }

        if (Schema::hasColumn('teacher', 'assigned_subject_ids')) {
            $existingSubjectIds = json_decode((string) ($teacher->assigned_subject_ids ?? '[]'), true) ?: [];
            $subjectIds = $teacherId === 23 ? [13, 14, 15, 16, 21, 22, 25, 26] : range(1, 12);

            $updates['assigned_subject_ids'] = json_encode(collect($existingSubjectIds)
                ->merge($subjectIds)
                ->map(fn ($id) => (int) $id)
                ->filter()
                ->unique()
                ->values()
                ->all());
        }

        if ($updates !== []) {
            DB::table('teacher')->where('id', $teacherId)->update($updates);
        }
    }
}
