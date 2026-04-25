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
            'code' => 'CHCC',
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
            'role' => 'Teacher',
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

        DB::table('question')->insert([
            [
                'code' => 'Q-PEER-1',
                'description' => 'Collaborates well with colleagues',
                'question_type_id' => $peerQuestionTypeId,
                'is_required' => 1,
                'is_activated' => 1,
                'is_deleted' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'Q-PEER-2',
                'description' => 'Supports the program effectively',
                'question_type_id' => $peerQuestionTypeId,
                'is_required' => 1,
                'is_activated' => 1,
                'is_deleted' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $response = $this->asTeacher($teacherId)
            ->post(route('portal.teacher.evaluate.submit'), [
                'category' => 'peer_teacher',
                'evaluatee_id' => $coTeacherId,
                'academic_year_id' => $cycleId,
                'school_year' => '2026-2027',
                'term' => '2nd Sem',
                'answers' => [
                    ['question_id' => 1, 'rating' => 5],
                    ['question_id' => 2, 'rating' => 4],
                ],
                'comments' => 'Strong teammate',
            ]);

        $response->assertRedirect(route('portal.teacher.dashboard'));

        $this->assertDatabaseHas('evaluation_submissions', [
            'evaluator_id' => $teacherId,
            'evaluator_type' => 'teacher',
            'evaluatee_id' => $coTeacherId,
            'evaluatee_type' => 'teacher',
            'category' => 'peer_teacher',
            'school_year' => '2026-2027',
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
}
