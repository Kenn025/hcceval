<?php

namespace Tests\Feature\Portal;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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

        return [
            'cycle_id' => $cycleId,
            'student_id' => $studentId,
            'teacher_employee_id' => $teacherEmployeeId,
            'subject_id' => $subjectId,
            'subject_section_id' => $subjectSectionId,
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
            'evaluator_id' => $ids['student_id'],
            'evaluator_type' => 'student',
            'evaluatee_id' => $ids['teacher_employee_id'],
            'evaluatee_type' => 'employee',
            'subject_section_id' => $ids['subject_section_id'],
            'category' => 'teacher_subject',
            'school_year' => '2026-2027',
            'term' => '1st Sem',
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
    }
}
