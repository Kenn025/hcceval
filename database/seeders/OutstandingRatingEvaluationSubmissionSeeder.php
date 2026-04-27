<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class OutstandingRatingEvaluationSubmissionSeeder extends Seeder
{
    private const SEED_MARKER = 'outstanding_ratings';

    public function run(): void
    {
        if (! $this->hasRequiredTables()) {
            return;
        }

        $academicYear = DB::table('academic_year')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderByDesc('id')
            ->first(['id']);

        if (! $academicYear) {
            return;
        }

        $now = now();
        $subjectTypeId = $this->questionnaireTypeId('QTYPE-SUBJECT');
        $headTypeId = $this->questionnaireTypeId('QTYPE-HEAD');
        $peerTypeId = $this->questionnaireTypeId('QTYPE-PEER');
        $subjectQuestionnaires = $this->questionnaireIds('QTYPE-SUBJECT');
        $headQuestionnaires = $this->questionnaireIds('QTYPE-HEAD');
        $peerQuestionnaires = $this->questionnaireIds('QTYPE-PEER');

        $faculty = $this->seedOutstandingEmployees($now);
        $this->clearPreviousSeededSubmissions();
        $this->clearPreviousSeededRatings();

        foreach ($this->subjectRatingRows() as $row) {
            $employeeId = $faculty[$row['employee_code']] ?? null;

            if (! $employeeId) {
                continue;
            }

            $this->upsertSubjectRating((int) $academicYear->id, $employeeId, $row, $now);

            $questionnaireId = $subjectQuestionnaires[$row['branch_id']] ?? null;
            $this->insertEvaluationSubmissions(
                branchId: $row['branch_id'],
                academicYearId: (int) $academicYear->id,
                questionnaireTypeId: $subjectTypeId,
                questionnaireId: $questionnaireId,
                employeeId: $employeeId,
                subjectId: $row['subject_id'],
                average: $row['average'],
                comments: $row['comments'],
                submittedAt: $now->copy()->subDays($row['days_ago'])
            );
        }

        foreach ($this->chairSubjectSubmissionRows() as $row) {
            $employeeId = $faculty[$row['employee_code']] ?? null;

            if (! $employeeId) {
                continue;
            }

            $questionnaireId = $subjectQuestionnaires[$row['branch_id']] ?? null;
            $this->insertEvaluationSubmissions(
                branchId: $row['branch_id'],
                academicYearId: (int) $academicYear->id,
                questionnaireTypeId: $subjectTypeId,
                questionnaireId: $questionnaireId,
                employeeId: $employeeId,
                subjectId: $row['subject_id'],
                average: $row['average'],
                comments: $row['comments'],
                submittedAt: $now->copy()->subDays($row['days_ago'])
            );
        }

        foreach ($this->peerRatingRows() as $row) {
            $employeeId = $faculty[$row['employee_code']] ?? null;

            if (! $employeeId) {
                continue;
            }

            $questionnaireId = $peerQuestionnaires[$row['branch_id']] ?? null;
            $this->insertEvaluationSubmissions(
                branchId: $row['branch_id'],
                academicYearId: (int) $academicYear->id,
                questionnaireTypeId: $peerTypeId,
                questionnaireId: $questionnaireId,
                employeeId: $employeeId,
                subjectId: null,
                average: $row['average'],
                comments: $row['comments'],
                submittedAt: $now->copy()->subDays($row['days_ago'])
            );
        }

        foreach ($this->headRatingRows() as $row) {
            $employeeId = $faculty[$row['employee_code']] ?? null;

            if (! $employeeId) {
                continue;
            }

            $this->upsertHeadRating((int) $academicYear->id, $employeeId, $row, $now);

            $questionnaireId = $headQuestionnaires[$row['branch_id']] ?? null;
            $this->insertEvaluationSubmissions(
                branchId: $row['branch_id'],
                academicYearId: (int) $academicYear->id,
                questionnaireTypeId: $headTypeId,
                questionnaireId: $questionnaireId,
                employeeId: $employeeId,
                subjectId: null,
                average: $row['average'],
                comments: $row['comments'],
                submittedAt: $now->copy()->subDays($row['days_ago'])
            );
        }
    }

    private function hasRequiredTables(): bool
    {
        foreach ([
            'academic_year',
            'employee',
            'evaluation_submissions',
            'questionnaire_type',
            'questionnaires',
            'ratings_head',
            'ratings_subject',
            'subject',
        ] as $table) {
            if (! Schema::hasTable($table)) {
                return false;
            }
        }

        return true;
    }

    private function seedOutstandingEmployees($now): array
    {
        $employees = [
            ['code' => 'OUT-FAC-SR-BSIT', 'firstname' => 'Rica', 'middlename' => 'E', 'lastname' => 'Salazar', 'role' => 'Teacher', 'branch_id' => 2, 'department_id' => 4, 'program_id' => 1],
            ['code' => 'OUT-FAC-SR-BSBA', 'firstname' => 'Elaine', 'middlename' => 'Q', 'lastname' => 'Mendoza', 'role' => 'Teacher', 'branch_id' => 2, 'department_id' => 4, 'program_id' => 2],
            ['code' => 'OUT-FAC-SR-BSED', 'firstname' => 'Victor', 'middlename' => 'R', 'lastname' => 'Castro', 'role' => 'Teacher', 'branch_id' => 2, 'department_id' => 4, 'program_id' => 3],
            ['code' => 'OUT-FAC-SR-BSCRIM', 'firstname' => 'Paula', 'middlename' => 'S', 'lastname' => 'Diaz', 'role' => 'Teacher', 'branch_id' => 2, 'department_id' => 4, 'program_id' => 4],
            ['code' => 'OUT-FAC-CH-BSIT', 'firstname' => 'Carla', 'middlename' => 'N', 'lastname' => 'Mendoza', 'role' => 'Teacher', 'branch_id' => 3, 'department_id' => 8, 'program_id' => 5],
            ['code' => 'OUT-FAC-CH-BSBA', 'firstname' => 'Liza', 'middlename' => 'P', 'lastname' => 'Aquino', 'role' => 'Teacher', 'branch_id' => 3, 'department_id' => 8, 'program_id' => 6],
            ['code' => 'OUT-FAC-CH-BSED', 'firstname' => 'Marco', 'middlename' => 'T', 'lastname' => 'Reyes', 'role' => 'Teacher', 'branch_id' => 3, 'department_id' => 8, 'program_id' => 7],
            ['code' => 'OUT-FAC-CH-BSCRIM', 'firstname' => 'Nora', 'middlename' => 'V', 'lastname' => 'Garcia', 'role' => 'Teacher', 'branch_id' => 3, 'department_id' => 8, 'program_id' => 8],
            ['code' => 'OUT-FAC-SR-SHS-STEM', 'firstname' => 'Mika', 'middlename' => 'B', 'lastname' => 'Torres', 'role' => 'Teacher', 'branch_id' => 2, 'department_id' => 3, 'program_id' => null, 'strand_id' => 1],
            ['code' => 'OUT-FAC-SR-SHS-ABM', 'firstname' => 'Nico', 'middlename' => 'C', 'lastname' => 'Villanueva', 'role' => 'Teacher', 'branch_id' => 2, 'department_id' => 3, 'program_id' => null, 'strand_id' => 2],
            ['code' => 'OUT-FAC-SR-JHS', 'firstname' => 'Rhea', 'middlename' => 'D', 'lastname' => 'Navarro', 'role' => 'Teacher', 'branch_id' => 2, 'department_id' => 2, 'program_id' => null, 'strand_id' => null],
            ['code' => 'OUT-FAC-CH-SHS-STEM', 'firstname' => 'Daryl', 'middlename' => 'B', 'lastname' => 'Manalo', 'role' => 'Teacher', 'branch_id' => 3, 'department_id' => 7, 'program_id' => null, 'strand_id' => 5],
            ['code' => 'OUT-FAC-CH-SHS-ABM', 'firstname' => 'Iris', 'middlename' => 'C', 'lastname' => 'De Leon', 'role' => 'Teacher', 'branch_id' => 3, 'department_id' => 7, 'program_id' => null, 'strand_id' => 6],
            ['code' => 'OUT-FAC-CH-JHS', 'firstname' => 'Oscar', 'middlename' => 'D', 'lastname' => 'Santiago', 'role' => 'Teacher', 'branch_id' => 3, 'department_id' => 6, 'program_id' => null, 'strand_id' => null],
            ['code' => 'OUT-CHAIR-SR-BSIT', 'firstname' => 'Juan', 'middlename' => 'D', 'lastname' => 'Dela Cruz', 'role' => 'Program Chair', 'branch_id' => 2, 'department_id' => 4, 'program_id' => 1],
            ['code' => 'OUT-CHAIR-SR-BSBA', 'firstname' => 'Maria', 'middlename' => 'L', 'lastname' => 'Santos', 'role' => 'Program Chair', 'branch_id' => 2, 'department_id' => 4, 'program_id' => 2],
            ['code' => 'OUT-CHAIR-SR-BSED', 'firstname' => 'Jose', 'middlename' => 'M', 'lastname' => 'Reyes', 'role' => 'Program Chair', 'branch_id' => 2, 'department_id' => 4, 'program_id' => 3],
            ['code' => 'OUT-CHAIR-SR-BSCRIM', 'firstname' => 'Ana', 'middlename' => 'K', 'lastname' => 'Garcia', 'role' => 'Program Chair', 'branch_id' => 2, 'department_id' => 4, 'program_id' => 4],
            ['code' => 'OUT-CHAIR-CH-BSIT', 'firstname' => 'Ricardo', 'middlename' => 'A', 'lastname' => 'Salazar', 'role' => 'Program Chair', 'branch_id' => 3, 'department_id' => 8, 'program_id' => 5],
            ['code' => 'OUT-CHAIR-CH-BSBA', 'firstname' => 'Helena', 'middlename' => 'C', 'lastname' => 'Cruz', 'role' => 'Program Chair', 'branch_id' => 3, 'department_id' => 8, 'program_id' => 6],
            ['code' => 'OUT-CHAIR-CH-BSED', 'firstname' => 'Samuel', 'middlename' => 'R', 'lastname' => 'Ramos', 'role' => 'Program Chair', 'branch_id' => 3, 'department_id' => 8, 'program_id' => 7],
            ['code' => 'OUT-CHAIR-CH-BSCRIM', 'firstname' => 'Teresa', 'middlename' => 'G', 'lastname' => 'Lim', 'role' => 'Program Chair', 'branch_id' => 3, 'department_id' => 8, 'program_id' => 8],
        ];

        foreach ($employees as $employee) {
            DB::table('employee')->updateOrInsert(
                ['code' => $employee['code']],
                [
                    ...$employee,
                    'personal_info' => json_encode([
                        'seed' => self::SEED_MARKER,
                        'purpose' => 'Outstanding ratings demo data',
                    ]),
                    'email' => strtolower($employee['code']) . '@hcc.test',
                    'password' => md5('password'),
                    'employee_department_id' => 13,
                    'strand_id' => $employee['strand_id'] ?? null,
                    'questionnaire_id' => null,
                    'is_activated' => 1,
                    'is_deleted' => 0,
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }

        return DB::table('employee')
            ->whereIn('code', array_column($employees, 'code'))
            ->pluck('id', 'code')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function clearPreviousSeededSubmissions(): void
    {
        DB::table('evaluation_submissions')
            ->where('comments', 'like', '%"seed":"' . self::SEED_MARKER . '"%')
            ->delete();
    }

    private function clearPreviousSeededRatings(): void
    {
        DB::table('ratings_subject')
            ->where('comments', 'like', '%"seed":"' . self::SEED_MARKER . '"%')
            ->delete();

        DB::table('ratings_head')
            ->where('comments', 'like', '%"seed":"' . self::SEED_MARKER . '"%')
            ->delete();
    }

    private function upsertSubjectRating(int $academicYearId, int $employeeId, array $row, $now): void
    {
        DB::table('ratings_subject')->updateOrInsert(
            [
                'academic_year_id' => $academicYearId,
                'subject_id' => $row['subject_id'],
                'employee_id' => $employeeId,
            ],
            [
                'submission_count' => $row['responses'],
                'is_archived' => 0,
                'archived_at' => null,
                'item_ratings' => json_encode($this->itemRatings($row['average'])),
                'comments' => json_encode($this->aggregateComments($row['comments'])),
                'overall_ratings' => json_encode(['average' => $row['average']]),
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );
    }

    private function upsertHeadRating(int $academicYearId, int $employeeId, array $row, $now): void
    {
        DB::table('ratings_head')->updateOrInsert(
            [
                'academic_year_id' => $academicYearId,
                'employee_id' => $employeeId,
            ],
            [
                'submission_count' => $row['responses'],
                'is_archived' => 0,
                'archived_at' => null,
                'item_ratings' => json_encode($this->itemRatings($row['average'])),
                'comments' => json_encode($this->aggregateComments($row['comments'])),
                'overall_ratings' => json_encode(['average' => $row['average']]),
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );
    }

    private function insertEvaluationSubmissions(
        int $branchId,
        int $academicYearId,
        ?int $questionnaireTypeId,
        ?int $questionnaireId,
        int $employeeId,
        ?int $subjectId,
        float $average,
        array $comments,
        $submittedAt
    ): void {
        for ($index = 0; $index < 3; $index++) {
            DB::table('evaluation_submissions')->insert([
                'branch_id' => $branchId,
                'academic_year_id' => $academicYearId,
                'questionnaire_type_id' => $questionnaireTypeId,
                'questionnaire_id' => $questionnaireId,
                'subject_id' => $subjectId,
                'teacher_id' => null,
                'employee_id' => $employeeId,
                'is_other' => 0,
                'answers' => json_encode($this->answers($average, $index)),
                'comments' => json_encode([
                    'seed' => self::SEED_MARKER,
                    'question_3' => $comments[$index % count($comments)],
                ]),
                'overall_average' => $this->sampleAverage($average, $index),
                'submitted_at' => $submittedAt->copy()->addHours($index * 2),
                'created_at' => $submittedAt->copy()->addHours($index * 2),
                'updated_at' => $submittedAt->copy()->addHours($index * 2),
            ]);
        }
    }

    private function questionnaireTypeId(string $code): ?int
    {
        $id = DB::table('questionnaire_type')->where('code', $code)->value('id');

        return $id ? (int) $id : null;
    }

    private function questionnaireIds(string $typeCode): array
    {
        return DB::table('questionnaires as q')
            ->join('questionnaire_type as qt', 'q.questionnaire_type_id', '=', 'qt.id')
            ->where('qt.code', $typeCode)
            ->where('q.is_deleted', 0)
            ->pluck('q.id', 'q.branch_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function answers(float $average, int $offset): array
    {
        $base = $average >= 4.85 ? [5, 5, 5, 5, 4] : ($average >= 4.70 ? [5, 5, 4, 5, 4] : [4, 5, 4, 5, 4]);
        $questions = [1, 6, 2, 4, 5];

        if ($offset === 1 && $average < 4.90) {
            $base[2] = max(4, $base[2] - 1);
        }

        return collect($questions)
            ->map(fn (int $questionId, int $index) => [
                'question_id' => $questionId,
                'rating' => $base[$index],
            ])
            ->values()
            ->all();
    }

    private function itemRatings(float $average): array
    {
        return collect([1, 6, 2, 4, 5])
            ->mapWithKeys(fn (int $questionId) => [
                (string) $questionId => [
                    'average' => round($average - 0.03 + (($questionId % 3) * 0.02), 2),
                    'responses' => 18,
                ],
            ])
            ->all();
    }

    private function aggregateComments(array $comments): array
    {
        return [
            'seed' => self::SEED_MARKER,
            'question_3' => $comments,
        ];
    }

    private function sampleAverage(float $average, int $index): float
    {
        return round(min(5, max(1, $average + (($index - 1) * 0.04))), 2);
    }

    private function subjectRatingRows(): array
    {
        return [
            ['employee_code' => 'OUT-FAC-SR-BSIT', 'branch_id' => 2, 'subject_id' => 1, 'average' => 4.93, 'responses' => 24, 'days_ago' => 12, 'comments' => ['Well prepared and clear in every topic.', 'Activities helped students understand the lessons.', 'Excellent guidance during laboratory tasks.']],
            ['employee_code' => 'OUT-FAC-SR-BSIT', 'branch_id' => 2, 'subject_id' => 2, 'average' => 4.91, 'responses' => 26, 'days_ago' => 11, 'comments' => ['Programming examples were easy to follow.', 'Gives helpful feedback on code exercises.', 'Encourages students to solve problems independently.']],
            ['employee_code' => 'OUT-FAC-SR-BSBA', 'branch_id' => 2, 'subject_id' => 3, 'average' => 4.76, 'responses' => 21, 'days_ago' => 10, 'comments' => ['Connects management topics to real scenarios.', 'Discussions are organized and practical.', 'Makes class participation comfortable.']],
            ['employee_code' => 'OUT-FAC-SR-BSBA', 'branch_id' => 2, 'subject_id' => 4, 'average' => 4.79, 'responses' => 22, 'days_ago' => 9, 'comments' => ['Accounting examples are explained clearly.', 'Provides useful practice before assessments.', 'Very approachable during consultations.']],
            ['employee_code' => 'OUT-FAC-SR-BSED', 'branch_id' => 2, 'subject_id' => 5, 'average' => 4.68, 'responses' => 19, 'days_ago' => 8, 'comments' => ['Lessons are meaningful for future teachers.', 'Shares good classroom management examples.', 'Encourages reflective learning.']],
            ['employee_code' => 'OUT-FAC-SR-BSCRIM', 'branch_id' => 2, 'subject_id' => 6, 'average' => 4.72, 'responses' => 20, 'days_ago' => 7, 'comments' => ['Uses strong real-world criminology examples.', 'Keeps discussions disciplined and focused.', 'Gives clear assessment reminders.']],
            ['employee_code' => 'OUT-FAC-CH-BSIT', 'branch_id' => 3, 'subject_id' => 7, 'average' => 4.88, 'responses' => 23, 'days_ago' => 12, 'comments' => ['Computing concepts are explained step by step.', 'Makes technical lessons less intimidating.', 'Always gives useful examples.']],
            ['employee_code' => 'OUT-FAC-CH-BSIT', 'branch_id' => 3, 'subject_id' => 8, 'average' => 4.86, 'responses' => 24, 'days_ago' => 11, 'comments' => ['Programming activities are engaging.', 'Very patient when answering questions.', 'Provides practical coding exercises.']],
            ['employee_code' => 'OUT-FAC-CH-BSBA', 'branch_id' => 3, 'subject_id' => 11, 'average' => 4.73, 'responses' => 20, 'days_ago' => 10, 'comments' => ['Organizes lessons very well.', 'Relates business topics to current examples.', 'Clear rubrics for activities.']],
            ['employee_code' => 'OUT-FAC-CH-BSBA', 'branch_id' => 3, 'subject_id' => 12, 'average' => 4.76, 'responses' => 21, 'days_ago' => 9, 'comments' => ['Accounting explanations are direct and useful.', 'Good pacing during discussions.', 'Helps students prepare for quizzes.']],
            ['employee_code' => 'OUT-FAC-CH-BSED', 'branch_id' => 3, 'subject_id' => 13, 'average' => 4.69, 'responses' => 18, 'days_ago' => 8, 'comments' => ['Builds confidence in teaching concepts.', 'Class activities are purposeful.', 'Feedback is constructive.']],
            ['employee_code' => 'OUT-FAC-CH-BSCRIM', 'branch_id' => 3, 'subject_id' => 14, 'average' => 4.71, 'responses' => 19, 'days_ago' => 7, 'comments' => ['Maintains professional classroom standards.', 'Examples are relevant to the field.', 'Instructions are easy to understand.']],
            ['employee_code' => 'OUT-FAC-SR-SHS-STEM', 'branch_id' => 2, 'subject_id' => 9, 'average' => 4.89, 'responses' => 23, 'days_ago' => 10, 'comments' => ['Explains mathematics with clear steps.', 'Activities help students prepare for STEM tasks.', 'Gives patient support during problem solving.']],
            ['employee_code' => 'OUT-FAC-SR-SHS-ABM', 'branch_id' => 2, 'subject_id' => 10, 'average' => 4.82, 'responses' => 21, 'days_ago' => 9, 'comments' => ['Business math lessons are practical.', 'Connects computations to real transactions.', 'Provides clear practice activities.']],
            ['employee_code' => 'OUT-FAC-SR-JHS', 'branch_id' => 2, 'subject_id' => 19, 'average' => 4.86, 'responses' => 22, 'days_ago' => 8, 'comments' => ['English lessons are engaging.', 'Encourages students to participate.', 'Gives helpful reading guidance.']],
            ['employee_code' => 'OUT-FAC-SR-JHS', 'branch_id' => 2, 'subject_id' => 20, 'average' => 4.83, 'responses' => 21, 'days_ago' => 7, 'comments' => ['Science examples are easy to follow.', 'Keeps class activities organized.', 'Explains experiments carefully.']],
            ['employee_code' => 'OUT-FAC-CH-SHS-STEM', 'branch_id' => 3, 'subject_id' => 15, 'average' => 4.87, 'responses' => 22, 'days_ago' => 10, 'comments' => ['Pre-calculus lessons are clear.', 'Guides students through difficult problems.', 'Uses effective board work and examples.']],
            ['employee_code' => 'OUT-FAC-CH-SHS-ABM', 'branch_id' => 3, 'subject_id' => 16, 'average' => 4.80, 'responses' => 20, 'days_ago' => 9, 'comments' => ['ABM topics are explained practically.', 'Activities are aligned with lessons.', 'Feedback is timely and useful.']],
            ['employee_code' => 'OUT-FAC-CH-JHS', 'branch_id' => 3, 'subject_id' => 21, 'average' => 4.84, 'responses' => 21, 'days_ago' => 8, 'comments' => ['English discussions are lively.', 'Students receive clear instructions.', 'Reading tasks are meaningful.']],
            ['employee_code' => 'OUT-FAC-CH-JHS', 'branch_id' => 3, 'subject_id' => 22, 'average' => 4.81, 'responses' => 20, 'days_ago' => 7, 'comments' => ['Science lessons are well organized.', 'Uses relatable examples.', 'Supports students during activities.']],
        ];
    }

    private function chairSubjectSubmissionRows(): array
    {
        return [
            ['employee_code' => 'OUT-CHAIR-SR-BSIT', 'branch_id' => 2, 'subject_id' => 1, 'average' => 4.82, 'days_ago' => 8, 'comments' => ['Subject discussions are well organized.', 'Provides clear examples from the program.', 'Supports students during consultation.']],
            ['employee_code' => 'OUT-CHAIR-SR-BSBA', 'branch_id' => 2, 'subject_id' => 3, 'average' => 4.76, 'days_ago' => 8, 'comments' => ['Business topics are explained clearly.', 'Uses practical class activities.', 'Gives useful feedback to students.']],
            ['employee_code' => 'OUT-CHAIR-SR-BSED', 'branch_id' => 2, 'subject_id' => 5, 'average' => 4.71, 'days_ago' => 8, 'comments' => ['Connects lessons to teaching practice.', 'Keeps students guided in activities.', 'Encourages reflective discussion.']],
            ['employee_code' => 'OUT-CHAIR-SR-BSCRIM', 'branch_id' => 2, 'subject_id' => 6, 'average' => 4.74, 'days_ago' => 8, 'comments' => ['Uses relevant criminology examples.', 'Explains requirements clearly.', 'Maintains strong classroom standards.']],
            ['employee_code' => 'OUT-CHAIR-CH-BSIT', 'branch_id' => 3, 'subject_id' => 7, 'average' => 4.88, 'days_ago' => 8, 'comments' => ['Computing lessons are clear and practical.', 'Guides students through technical tasks.', 'Provides timely feedback.']],
            ['employee_code' => 'OUT-CHAIR-CH-BSBA', 'branch_id' => 3, 'subject_id' => 11, 'average' => 4.80, 'days_ago' => 8, 'comments' => ['Management topics are easy to follow.', 'Class activities are well prepared.', 'Encourages participation.']],
            ['employee_code' => 'OUT-CHAIR-CH-BSED', 'branch_id' => 3, 'subject_id' => 13, 'average' => 4.74, 'days_ago' => 8, 'comments' => ['Education lessons are meaningful.', 'Students receive clear guidance.', 'Feedback helps improve outputs.']],
            ['employee_code' => 'OUT-CHAIR-CH-BSCRIM', 'branch_id' => 3, 'subject_id' => 14, 'average' => 4.76, 'days_ago' => 8, 'comments' => ['Keeps discussions focused.', 'Relates lessons to field practice.', 'Gives clear reminders before assessments.']],
        ];
    }

    private function peerRatingRows(): array
    {
        return [
            ['employee_code' => 'OUT-FAC-SR-BSIT', 'branch_id' => 2, 'average' => 4.90, 'days_ago' => 6, 'comments' => ['Collaborates well with co-faculty.', 'Shares teaching materials generously.', 'Responds professionally to peer feedback.']],
            ['employee_code' => 'OUT-FAC-SR-BSBA', 'branch_id' => 2, 'average' => 4.75, 'days_ago' => 6, 'comments' => ['Coordinates smoothly with the team.', 'Contributes practical ideas during meetings.', 'Maintains professional communication.']],
            ['employee_code' => 'OUT-FAC-SR-BSED', 'branch_id' => 2, 'average' => 4.70, 'days_ago' => 6, 'comments' => ['Supports department activities.', 'Shares useful classroom strategies.', 'Works respectfully with colleagues.']],
            ['employee_code' => 'OUT-FAC-SR-BSCRIM', 'branch_id' => 2, 'average' => 4.73, 'days_ago' => 6, 'comments' => ['Maintains discipline in team tasks.', 'Communicates expectations clearly.', 'Supports program activities.']],
            ['employee_code' => 'OUT-FAC-SR-SHS-STEM', 'branch_id' => 2, 'average' => 4.86, 'days_ago' => 6, 'comments' => ['Helps peers prepare STEM activities.', 'Shares clear lesson materials.', 'Coordinates well with advisers.']],
            ['employee_code' => 'OUT-FAC-SR-SHS-ABM', 'branch_id' => 2, 'average' => 4.79, 'days_ago' => 6, 'comments' => ['Contributes to SHS planning.', 'Works well with strand teachers.', 'Provides helpful peer support.']],
            ['employee_code' => 'OUT-FAC-SR-JHS', 'branch_id' => 2, 'average' => 4.83, 'days_ago' => 6, 'comments' => ['Supports junior high faculty activities.', 'Communicates clearly with peers.', 'Shares classroom resources.']],
            ['employee_code' => 'OUT-FAC-CH-BSIT', 'branch_id' => 3, 'average' => 4.86, 'days_ago' => 6, 'comments' => ['Supports computing faculty tasks.', 'Shares useful teaching resources.', 'Coordinates well with peers.']],
            ['employee_code' => 'OUT-FAC-CH-BSBA', 'branch_id' => 3, 'average' => 4.74, 'days_ago' => 6, 'comments' => ['Communicates well with the department.', 'Supports team planning.', 'Responds constructively to suggestions.']],
            ['employee_code' => 'OUT-FAC-CH-BSED', 'branch_id' => 3, 'average' => 4.69, 'days_ago' => 6, 'comments' => ['Shares teaching ideas.', 'Participates actively in meetings.', 'Supports education activities.']],
            ['employee_code' => 'OUT-FAC-CH-BSCRIM', 'branch_id' => 3, 'average' => 4.72, 'days_ago' => 6, 'comments' => ['Coordinates well with colleagues.', 'Maintains professional standards.', 'Helps with program activities.']],
            ['employee_code' => 'OUT-FAC-CH-SHS-STEM', 'branch_id' => 3, 'average' => 4.84, 'days_ago' => 6, 'comments' => ['Shares STEM resources.', 'Supports strand coordination.', 'Works well with SHS peers.']],
            ['employee_code' => 'OUT-FAC-CH-SHS-ABM', 'branch_id' => 3, 'average' => 4.77, 'days_ago' => 6, 'comments' => ['Contributes to ABM planning.', 'Collaborates respectfully.', 'Provides helpful inputs.']],
            ['employee_code' => 'OUT-FAC-CH-JHS', 'branch_id' => 3, 'average' => 4.80, 'days_ago' => 6, 'comments' => ['Supports junior high planning.', 'Shares clear classroom practices.', 'Communicates professionally.']],
            ['employee_code' => 'OUT-CHAIR-SR-BSIT', 'branch_id' => 2, 'average' => 4.83, 'days_ago' => 5, 'comments' => ['Coordinates faculty tasks clearly.', 'Supports peers during program work.', 'Encourages professional collaboration.']],
            ['employee_code' => 'OUT-CHAIR-SR-BSBA', 'branch_id' => 2, 'average' => 4.77, 'days_ago' => 5, 'comments' => ['Keeps program communication organized.', 'Listens to faculty suggestions.', 'Supports team planning.']],
            ['employee_code' => 'OUT-CHAIR-SR-BSED', 'branch_id' => 2, 'average' => 4.72, 'days_ago' => 5, 'comments' => ['Guides faculty collaboration.', 'Provides helpful reminders.', 'Encourages shared responsibility.']],
            ['employee_code' => 'OUT-CHAIR-SR-BSCRIM', 'branch_id' => 2, 'average' => 4.74, 'days_ago' => 5, 'comments' => ['Maintains clear program coordination.', 'Supports faculty concerns.', 'Promotes professional standards.']],
            ['employee_code' => 'OUT-CHAIR-CH-BSIT', 'branch_id' => 3, 'average' => 4.89, 'days_ago' => 5, 'comments' => ['Leads peer collaboration effectively.', 'Supports faculty needs.', 'Coordinates program work very well.']],
            ['employee_code' => 'OUT-CHAIR-CH-BSBA', 'branch_id' => 3, 'average' => 4.81, 'days_ago' => 5, 'comments' => ['Communicates program updates clearly.', 'Encourages faculty participation.', 'Handles peer concerns professionally.']],
            ['employee_code' => 'OUT-CHAIR-CH-BSED', 'branch_id' => 3, 'average' => 4.76, 'days_ago' => 5, 'comments' => ['Supports education faculty planning.', 'Promotes collaboration.', 'Gives clear guidance.']],
            ['employee_code' => 'OUT-CHAIR-CH-BSCRIM', 'branch_id' => 3, 'average' => 4.78, 'days_ago' => 5, 'comments' => ['Maintains strong coordination.', 'Works constructively with peers.', 'Keeps expectations clear.']],
        ];
    }

    private function headRatingRows(): array
    {
        return [
            ['employee_code' => 'OUT-CHAIR-SR-BSIT', 'branch_id' => 2, 'average' => 4.84, 'responses' => 18, 'days_ago' => 6, 'comments' => ['Leads the program with clear direction.', 'Supports faculty and student concerns.', 'Coordinates academic work efficiently.']],
            ['employee_code' => 'OUT-CHAIR-SR-BSBA', 'branch_id' => 2, 'average' => 4.78, 'responses' => 17, 'days_ago' => 5, 'comments' => ['Communicates program updates clearly.', 'Responsive to student concerns.', 'Keeps activities organized.']],
            ['employee_code' => 'OUT-CHAIR-SR-BSED', 'branch_id' => 2, 'average' => 4.70, 'responses' => 16, 'days_ago' => 4, 'comments' => ['Supports teaching practice preparation.', 'Encourages collaboration among students.', 'Guidance is consistent.']],
            ['employee_code' => 'OUT-CHAIR-SR-BSCRIM', 'branch_id' => 2, 'average' => 4.73, 'responses' => 16, 'days_ago' => 3, 'comments' => ['Keeps program expectations clear.', 'Promotes discipline in activities.', 'Approachable during consultations.']],
            ['employee_code' => 'OUT-CHAIR-CH-BSIT', 'branch_id' => 3, 'average' => 4.90, 'responses' => 19, 'days_ago' => 6, 'comments' => ['Excellent coordination of program activities.', 'Very supportive of student learning needs.', 'Provides strong leadership to the department.']],
            ['employee_code' => 'OUT-CHAIR-CH-BSBA', 'branch_id' => 3, 'average' => 4.82, 'responses' => 18, 'days_ago' => 5, 'comments' => ['Program communication is timely.', 'Listens to student feedback.', 'Maintains organized academic planning.']],
            ['employee_code' => 'OUT-CHAIR-CH-BSED', 'branch_id' => 3, 'average' => 4.75, 'responses' => 17, 'days_ago' => 4, 'comments' => ['Supports education students well.', 'Keeps program activities aligned.', 'Encourages professional growth.']],
            ['employee_code' => 'OUT-CHAIR-CH-BSCRIM', 'branch_id' => 3, 'average' => 4.77, 'responses' => 17, 'days_ago' => 3, 'comments' => ['Gives clear direction to the program.', 'Maintains strong academic standards.', 'Handles concerns professionally.']],
        ];
    }
}
