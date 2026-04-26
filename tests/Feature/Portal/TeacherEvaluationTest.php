<?php

namespace Tests\Feature\Portal;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TeacherEvaluationTest extends TestCase
{
    use RefreshDatabase;

    private function asTeacher(int $id): self
    {
        return $this->withSession([
            'client_type' => 'faculty',
            'client_source' => 'teacher',
            'client_id' => $id,
        ]);
    }

    public function test_teacher_peer_evaluation_writes_submission_and_aggregates_ratings_peer(): void
    {
        $branchId = (int) DB::table('branch')->insertGetId([
            'code' => 'CHCC-PEER-T',
            'name' => 'Concepcion Holy Cross College',
            'address' => 'Test',
            'is_main' => 0,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $departmentId = (int) DB::table('department')->insertGetId([
            'code' => 'DEP-COL-HEAD-T',
            'name' => 'College Department',
            'branch_id' => $branchId,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $programId = (int) DB::table('program')->insertGetId([
            'code' => 'BSIT-HEAD-T',
            'name' => 'Bachelor of Science in Information Technology',
            'department_id' => $departmentId,
            'duration_years' => 4,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $cycleId = (int) DB::table('academic_year')->insertGetId([
            'from_year' => 2026,
            'to_year' => 2027,
            'term' => '2nd Sem',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $peerQuestionTypeId = (int) DB::table('question_type')->insertGetId([
            'code' => 'QTYPE-PEER',
            'name' => 'Peer Evaluation',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $peerQuestionnaireTypeId = (int) DB::table('questionnaire_type')->insertGetId([
            'code' => 'QTYPE-PEER-TEST',
            'name' => 'Peer Evaluation',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $questionOneId = (int) DB::table('question')->insertGetId([
            'code' => 'Q-PEER-1',
            'description' => 'Collaborates well with colleagues',
            'question_type_id' => $peerQuestionTypeId,
            'is_required' => 1,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $questionTwoId = (int) DB::table('question')->insertGetId([
            'code' => 'Q-PEER-2',
            'description' => 'Supports the program effectively',
            'question_type_id' => $peerQuestionTypeId,
            'is_required' => 1,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $peerQuestionnaireId = (int) DB::table('questionnaires')->insertGetId([
            'code' => 'PEER-QUEST-TEST',
            'title' => 'Peer Questionnaire',
            'questionnaire_type_id' => $peerQuestionnaireTypeId,
            'items' => json_encode([
                'scale_questions' => [
                    ['class_name' => 'Peer Collaboration', 'questions' => [$questionOneId, $questionTwoId]],
                ],
            ]),
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $teacherId = (int) DB::table('teacher')->insertGetId([
            'code' => 'TCH-001',
            'firstname' => 'Theresa',
            'lastname' => 'Domingo',
            'email' => 'theresa@test.local',
            'password' => bcrypt('secret'),
            'branch_id' => $branchId,
            'department_id' => $departmentId,
            'program_id' => $programId,
            'role' => 'Teacher',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $coTeacherId = (int) DB::table('teacher')->insertGetId([
            'code' => 'TCH-002',
            'firstname' => 'Rica',
            'lastname' => 'Salazar',
            'email' => 'rica@test.local',
            'password' => bcrypt('secret'),
            'branch_id' => $branchId,
            'department_id' => $departmentId,
            'program_id' => $programId,
            'questionnaire_id' => $peerQuestionnaireId,
            'role' => 'Teacher',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->asTeacher($teacherId)
            ->post(route('portal.teacher.evaluate.submit'), [
                'category' => 'peer_teacher',
                'evaluatee_id' => $coTeacherId,
                'academic_year_id' => $cycleId,
                'school_year' => '2026-2027',
                'term' => '2nd Sem',
                'answers' => [
                    ['question_id' => $questionOneId, 'rating' => 5],
                    ['question_id' => $questionTwoId, 'rating' => 4],
                ],
                'comments' => 'Strong teammate',
            ]);

        $response->assertRedirect(route('portal.teacher.dashboard'));

        $this->assertDatabaseHas('evaluation_submissions', [
            'academic_year_id' => $cycleId,
            'teacher_id' => $coTeacherId,
            'questionnaire_type_id' => $peerQuestionnaireTypeId,
        ]);

        $row = DB::table('ratings_peer')
            ->where('academic_year_id', $cycleId)
            ->where('teacher_id', $coTeacherId)
            ->first();

        $this->assertNotNull($row, 'ratings_peer row should exist after teacher submission');
        $this->assertSame(1, (int) $row->submission_count);

        $overall = json_decode($row->overall_ratings, true);
        $this->assertEqualsWithDelta(4.5, (float) $overall['average'], 0.01);
    }

    public function test_teacher_head_evaluation_writes_submission_without_touching_employee_head_ratings(): void
    {
        $branchId = (int) DB::table('branch')->insertGetId([
            'code' => 'CHCC-HEAD-T',
            'name' => 'Concepcion Holy Cross College',
            'address' => 'Test',
            'is_main' => 0,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $departmentId = (int) DB::table('department')->insertGetId([
            'code' => 'DEP-COL',
            'name' => 'College Department',
            'branch_id' => $branchId,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $programId = (int) DB::table('program')->insertGetId([
            'code' => 'BSIT',
            'name' => 'Bachelor of Science in Information Technology',
            'department_id' => $departmentId,
            'duration_years' => 4,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $cycleId = (int) DB::table('academic_year')->insertGetId([
            'from_year' => 2026,
            'to_year' => 2027,
            'term' => '2nd Sem',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $questionTypeId = (int) DB::table('question_type')->insertGetId([
            'code' => 'QTYPE-HEAD',
            'name' => 'School Head Evaluation',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $questionnaireTypeId = (int) DB::table('questionnaire_type')->insertGetId([
            'code' => 'QTYPE-HEAD-TEST',
            'name' => 'School Head Evaluation',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $headQuestionOneId = (int) DB::table('question')->insertGetId([
            'code' => 'Q-HEAD-1',
            'description' => 'Leads the program effectively',
            'question_type_id' => $questionTypeId,
            'is_required' => 1,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $headQuestionTwoId = (int) DB::table('question')->insertGetId([
            'code' => 'Q-HEAD-2',
            'description' => 'Communicates clear direction',
            'question_type_id' => $questionTypeId,
            'is_required' => 1,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $headQuestionnaireId = (int) DB::table('questionnaires')->insertGetId([
            'code' => 'HEAD-QUEST',
            'title' => 'Head Questionnaire',
            'questionnaire_type_id' => $questionnaireTypeId,
            'items' => json_encode([
                'scale_questions' => [
                    ['class_name' => 'Leadership', 'questions' => [$headQuestionOneId, $headQuestionTwoId]],
                ],
            ]),
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $teacherId = (int) DB::table('teacher')->insertGetId([
            'code' => 'TCH-101',
            'firstname' => 'Theresa',
            'lastname' => 'Domingo',
            'email' => 'theresa-head@test.local',
            'password' => bcrypt('secret'),
            'branch_id' => $branchId,
            'department_id' => $departmentId,
            'program_id' => $programId,
            'role' => 'Teacher',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $chairId = (int) DB::table('teacher')->insertGetId([
            'code' => 'TCH-102',
            'firstname' => 'Marian',
            'lastname' => 'Santos',
            'email' => 'chair@test.local',
            'password' => bcrypt('secret'),
            'branch_id' => $branchId,
            'department_id' => $departmentId,
            'program_id' => $programId,
            'role' => 'Program Chair',
            'questionnaire_id' => $headQuestionnaireId,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->asTeacher($teacherId)
            ->post(route('portal.teacher.evaluate.submit'), [
                'category' => 'head_teacher',
                'evaluatee_id' => $chairId,
                'academic_year_id' => $cycleId,
                'school_year' => '2026-2027',
                'term' => '2nd Sem',
                'answers' => [
                    ['question_id' => $headQuestionOneId, 'rating' => 5],
                    ['question_id' => $headQuestionTwoId, 'rating' => 4],
                ],
                'comments' => 'Strong leadership',
            ]);

        $response->assertRedirect(route('portal.teacher.dashboard'));

        $this->assertDatabaseHas('evaluation_submissions', [
            'academic_year_id' => $cycleId,
            'teacher_id' => $chairId,
            'questionnaire_type_id' => $questionnaireTypeId,
        ]);

        $this->assertSame(0, DB::table('ratings_head')->count());
    }
}
