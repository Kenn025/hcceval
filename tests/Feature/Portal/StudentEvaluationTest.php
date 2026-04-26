<?php

namespace Tests\Feature\Portal;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StudentEvaluationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('subject_sections', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('subject_id');
            $table->unsignedBigInteger('section_id')->nullable();
            $table->unsignedBigInteger('teacher_employee_id')->nullable();
            $table->string('school_year', 20);
            $table->string('term', 50);
            $table->string('schedule')->nullable();
            $table->string('room')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('deleted_at')->nullable();
        });

        Schema::create('student_enrollments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('subject_section_id');
            $table->string('status', 50)->default('enrolled');
        });
    }

    private function seedEvaluationContext(): array
    {
        $branchId = (int) DB::table('branch')->insertGetId([
            'code' => 'STU-BR',
            'name' => 'Student Test Branch',
            'address' => 'Test',
            'is_main' => 0,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $departmentId = (int) DB::table('department')->insertGetId([
            'code' => 'STU-DEP',
            'name' => 'Student Test Department',
            'branch_id' => $branchId,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $cycleId = (int) DB::table('academic_year')->insertGetId([
            'from_year' => 2026,
            'to_year' => 2027,
            'term' => '1st Sem',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentId = (int) DB::table('student')->insertGetId([
            'code' => 'STU-001',
            'firstname' => 'Sam',
            'lastname' => 'Student',
            'email' => 'sam.student@hcc.local',
            'password' => bcrypt('test12345'),
            'branch_id' => $branchId,
            'department_id' => $departmentId,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $teacherEmployeeId = (int) DB::table('employee')->insertGetId([
            'code' => 'EMP-TCH-001',
            'firstname' => 'Terry',
            'lastname' => 'Teacher',
            'email' => 'terry.teacher@hcc.local',
            'password' => bcrypt('test12345'),
            'branch_id' => $branchId,
            'department_id' => $departmentId,
            'role' => 'Teacher',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $subjectId = (int) DB::table('subject')->insertGetId([
            'code' => 'SUBJ-101',
            'name' => 'Evaluation Testing',
            'type' => 'college',
            'department_id' => $departmentId,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $subjectSectionId = (int) DB::table('subject_sections')->insertGetId([
            'subject_id' => $subjectId,
            'teacher_employee_id' => $teacherEmployeeId,
            'school_year' => '2026-2027',
            'term' => '1st Sem',
            'is_active' => 1,
        ]);

        DB::table('student_enrollments')->insert([
            'student_id' => $studentId,
            'subject_section_id' => $subjectSectionId,
            'status' => 'enrolled',
        ]);

        $questionTypeId = (int) DB::table('question_type')->insertGetId([
            'code' => 'teacher_subject',
            'name' => 'Teacher Subject',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('question')->insert([
            [
                'code' => 'Q-SUBJ-1',
                'description' => 'Explains lessons clearly',
                'question_type_id' => $questionTypeId,
                'is_required' => 1,
                'is_activated' => 1,
                'is_deleted' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'Q-SUBJ-2',
                'description' => 'Engages the class effectively',
                'question_type_id' => $questionTypeId,
                'is_required' => 1,
                'is_activated' => 1,
                'is_deleted' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $questionnaireTypeId = (int) DB::table('questionnaire_type')->insertGetId([
            'code' => 'QTYPE-SUBJECT-TEST',
            'name' => 'Subject Teacher Test Form',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $questionnaireId = (int) DB::table('questionnaires')->insertGetId([
            'code' => 'QUES-STU-TEST',
            'title' => 'Student Evaluation Test Questionnaire',
            'questionnaire_type_id' => $questionnaireTypeId,
            'items' => json_encode([
                'scale_questions' => [[
                    'class_name' => 'Teaching',
                    'weight_percentage' => 100,
                    'questions' => [1, 2],
                ]],
            ]),
            'comments' => json_encode([]),
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('subject')->where('id', $subjectId)->update([
            'questionnaire_id' => $questionnaireId,
        ]);

        return [
            'cycle_id' => $cycleId,
            'student_id' => $studentId,
            'teacher_employee_id' => $teacherEmployeeId,
            'subject_id' => $subjectId,
            'subject_section_id' => $subjectSectionId,
            'branch_id' => $branchId,
            'questionnaire_type_id' => $questionnaireTypeId,
            'questionnaire_id' => $questionnaireId,
        ];
    }

    private function asStudent(int $id): self
    {
        return $this->withSession([
            'client_type' => 'student',
            'client_source' => 'student',
            'client_id' => $id,
        ]);
    }

    public function test_student_subject_evaluation_writes_submission_and_aggregates_ratings_subject(): void
    {
        $ids = $this->seedEvaluationContext();

        $response = $this->asStudent($ids['student_id'])
            ->post(route('portal.student.evaluate.submit'), [
                'category' => 'teacher_subject',
                'evaluatee_id' => $ids['teacher_employee_id'],
                'subject_section_id' => $ids['subject_section_id'],
                'questionnaire_id' => $ids['questionnaire_id'],
                'academic_year_id' => $ids['cycle_id'],
                'school_year' => '2026-2027',
                'term' => '1st Sem',
                'answers' => [
                    ['question_id' => 1, 'rating' => 5],
                    ['question_id' => 2, 'rating' => 4],
                ],
                'comments' => 'Strong instruction',
            ]);

        $response->assertRedirect(route('portal.student.dashboard'));

        $this->assertDatabaseHas('evaluation_submissions', [
            'branch_id' => $ids['branch_id'],
            'academic_year_id' => $ids['cycle_id'],
            'questionnaire_type_id' => $ids['questionnaire_type_id'],
            'questionnaire_id' => $ids['questionnaire_id'],
            'subject_id' => $ids['subject_id'],
            'teacher_id' => $ids['teacher_employee_id'],
        ]);

        $row = DB::table('ratings_subject')
            ->where('academic_year_id', $ids['cycle_id'])
            ->where('subject_id', $ids['subject_id'])
            ->where('employee_id', $ids['teacher_employee_id'])
            ->first();

        $this->assertNotNull($row, 'ratings_subject row should exist after student submission');
        $this->assertSame(1, (int) $row->submission_count);

        $overall = json_decode($row->overall_ratings, true);
        $this->assertEqualsWithDelta(4.5, (float) $overall['average'], 0.01);

        $submission = DB::table('evaluation_submissions')
            ->where('branch_id', $ids['branch_id'])
            ->where('academic_year_id', $ids['cycle_id'])
            ->where('questionnaire_type_id', $ids['questionnaire_type_id'])
            ->where('questionnaire_id', $ids['questionnaire_id'])
            ->where('subject_id', $ids['subject_id'])
            ->where('teacher_id', $ids['teacher_employee_id'])
            ->first();

        $this->assertNotNull($submission, 'evaluation_submissions row should exist after student submission');
        $this->assertCount(2, json_decode($submission->answers, true));
        $this->assertSame(['text' => 'Strong instruction'], json_decode($submission->comments, true));

        $studentSubmissionIds = json_decode(
            DB::table('student')->where('id', $ids['student_id'])->value('evaluation_submission_ids'),
            true
        );

        $this->assertContains((int) $submission->id, $studentSubmissionIds);

        $dashboard = $this->asStudent($ids['student_id'])
            ->get(route('portal.student.dashboard'));

        $dashboard->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Student/Dashboard')
                ->where('subjects.0.overall_rating', 4.5)
                ->where('subjects.0.overall_percentage', 90.0)
                ->where('subjects.0.rating_submission_count', 1))
            ->assertSee('Evaluation Testing')
            ->assertSee('Terry  Teacher')
            ->assertSee('Explains lessons clearly')
            ->assertSee('Strong instruction');

        $oldCycleId = (int) DB::table('academic_year')->insertGetId([
            'from_year' => 2025,
            'to_year' => 2026,
            'term' => '2nd Sem',
            'is_activated' => 0,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $oldSubmissionId = (int) DB::table('evaluation_submissions')->insertGetId([
            'branch_id' => $ids['branch_id'],
            'academic_year_id' => $oldCycleId,
            'questionnaire_type_id' => $ids['questionnaire_type_id'],
            'questionnaire_id' => $ids['questionnaire_id'],
            'teacher_id' => $ids['teacher_employee_id'],
            'answers' => json_encode([
                ['question_id' => 1, 'rating' => 4],
                ['question_id' => 2, 'rating' => 4],
            ]),
            'comments' => json_encode(['text' => 'Older archive record']),
            'created_at' => now()->subYear(),
            'updated_at' => now()->subYear(),
        ]);

        DB::table('student')->where('id', $ids['student_id'])->update([
            'evaluation_submission_ids' => json_encode([(int) $submission->id, $oldSubmissionId]),
        ]);

        $this->asStudent($ids['student_id'])
            ->get(route('portal.student.dashboard'))
            ->assertOk()
            ->assertSee('2025-2026')
            ->assertSee('2nd Semester')
            ->assertSee('Older archive record');

        $secondStudentId = (int) DB::table('student')->insertGetId([
            'code' => 'STU-002',
            'firstname' => 'Casey',
            'lastname' => 'Student',
            'email' => 'casey.student@hcc.local',
            'password' => bcrypt('test12345'),
            'branch_id' => $ids['branch_id'],
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('student_enrollments')->insert([
            'student_id' => $secondStudentId,
            'subject_section_id' => $ids['subject_section_id'],
            'status' => 'enrolled',
        ]);

        $this->asStudent($secondStudentId)
            ->post(route('portal.student.evaluate.submit'), [
                'category' => 'teacher_subject',
                'evaluatee_id' => $ids['teacher_employee_id'],
                'subject_section_id' => $ids['subject_section_id'],
                'questionnaire_id' => $ids['questionnaire_id'],
                'academic_year_id' => $ids['cycle_id'],
                'school_year' => '2026-2027',
                'term' => '1st Sem',
                'answers' => [
                    ['question_id' => 1, 'rating' => 5],
                    ['question_id' => 2, 'rating' => 5],
                ],
                'comments' => 'Also submitted',
            ])
            ->assertRedirect(route('portal.student.dashboard'));

        $this->assertSame(2, DB::table('evaluation_submissions')
            ->where('academic_year_id', $ids['cycle_id'])
            ->where('questionnaire_id', $ids['questionnaire_id'])
            ->where('teacher_id', $ids['teacher_employee_id'])
            ->count());

        $secondSubmissionIds = json_decode(
            DB::table('student')->where('id', $secondStudentId)->value('evaluation_submission_ids'),
            true
        );

        $this->assertCount(1, $secondSubmissionIds);
        $this->assertNotContains((int) $submission->id, $secondSubmissionIds);
    }
}
