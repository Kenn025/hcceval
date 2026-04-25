<?php

namespace Tests\Feature\Portal;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EmployeeEvaluationTest extends TestCase
{
    use RefreshDatabase;

    private function seedCycleAndEmployees(): array
    {
        $branchId = (int) DB::table('branch')->insertGetId([
            'code' => 'TEST-BR',
            'name' => 'Test Branch',
            'address' => 'Test',
            'is_main' => 0,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $deptId = (int) DB::table('department')->insertGetId([
            'code' => 'DEP-T',
            'name' => 'Test Department',
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

        $evaluatorId = (int) DB::table('employee')->insertGetId([
            'code' => 'EMP-001',
            'firstname' => 'Eve',
            'lastname' => 'Aluator',
            'email' => 'eve@hcc.local',
            'password' => bcrypt('test12345'),
            'branch_id' => $branchId,
            'department_id' => $deptId,
            'role' => 'Employee',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $evaluateeId = (int) DB::table('employee')->insertGetId([
            'code' => 'EMP-002',
            'firstname' => 'Pete',
            'lastname' => 'Peer',
            'email' => 'pete@hcc.local',
            'password' => bcrypt('test12345'),
            'branch_id' => $branchId,
            'department_id' => $deptId,
            'role' => 'Employee',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $headId = (int) DB::table('employee')->insertGetId([
            'code' => 'EMP-HEAD-001',
            'firstname' => 'Helen',
            'lastname' => 'Head',
            'email' => 'helen@hcc.local',
            'password' => bcrypt('test12345'),
            'branch_id' => $branchId,
            'department_id' => $deptId,
            'role' => 'Department Head',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'cycle_id' => $cycleId,
            'evaluator_id' => $evaluatorId,
            'evaluatee_id' => $evaluateeId,
            'head_id' => $headId,
        ];
    }

    private function asEmployee(int $id): self
    {
        return $this->withSession([
            'client_type'   => 'faculty',
            'client_source' => 'employee',
            'client_id'     => $id,
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'category'         => 'peer_employee',
            'evaluatee_id'     => 0,
            'academic_year_id' => 0,
            'school_year'      => '2026-2027',
            'term'             => '1st Sem',
            'answers' => [
                ['question_id' => 1, 'rating' => 5],
                ['question_id' => 2, 'rating' => 4],
                ['question_id' => 3, 'rating' => 3],
            ],
            'comments' => 'Great work',
        ], $overrides);
    }

    public function test_employee_peer_evaluation_writes_submission_and_aggregates_ratings_employee(): void
    {
        $ids = $this->seedCycleAndEmployees();

        $response = $this->asEmployee($ids['evaluator_id'])
            ->post(route('portal.employee.evaluate.submit'), $this->payload([
                'category'         => 'peer_employee',
                'evaluatee_id'     => $ids['evaluatee_id'],
                'academic_year_id' => $ids['cycle_id'],
            ]));

        $response->assertRedirect(route('portal.employee.dashboard'));

        $this->assertDatabaseHas('evaluation_submissions', [
            'evaluator_id'   => $ids['evaluator_id'],
            'evaluator_type' => 'employee',
            'evaluatee_id'   => $ids['evaluatee_id'],
            'category'       => 'peer_employee',
            'school_year'    => '2026-2027',
            'term'           => '1st Sem',
        ]);

        $row = DB::table('ratings_employee')
            ->where('academic_year_id', $ids['cycle_id'])
            ->where('employee_id', $ids['evaluatee_id'])
            ->first();

        $this->assertNotNull($row, 'ratings_employee row should exist after first submission');
        $this->assertSame(1, (int) $row->submission_count);

        $overall = json_decode($row->overall_ratings, true);
        $this->assertEqualsWithDelta(4.0, (float) $overall['average'], 0.01);
    }

    public function test_employee_head_evaluation_aggregates_ratings_head(): void
    {
        $ids = $this->seedCycleAndEmployees();

        $this->asEmployee($ids['evaluator_id'])
            ->post(route('portal.employee.evaluate.submit'), $this->payload([
                'category'         => 'head',
                'evaluatee_id'     => $ids['head_id'],
                'academic_year_id' => $ids['cycle_id'],
                'answers' => [
                    ['question_id' => 1, 'rating' => 5],
                    ['question_id' => 2, 'rating' => 5],
                ],
            ]))
            ->assertRedirect(route('portal.employee.dashboard'));

        $row = DB::table('ratings_head')
            ->where('academic_year_id', $ids['cycle_id'])
            ->where('employee_id', $ids['head_id'])
            ->first();

        $this->assertNotNull($row, 'ratings_head row should exist after head evaluation');
        $this->assertSame(1, (int) $row->submission_count);

        $overall = json_decode($row->overall_ratings, true);
        $this->assertEqualsWithDelta(5.0, (float) $overall['average'], 0.01);
    }

    public function test_employee_cannot_submit_same_evaluation_twice(): void
    {
        $ids = $this->seedCycleAndEmployees();

        $payload = $this->payload([
            'category'         => 'peer_employee',
            'evaluatee_id'     => $ids['evaluatee_id'],
            'academic_year_id' => $ids['cycle_id'],
        ]);

        $this->asEmployee($ids['evaluator_id'])
            ->post(route('portal.employee.evaluate.submit'), $payload)
            ->assertRedirect();

        $second = $this->asEmployee($ids['evaluator_id'])
            ->post(route('portal.employee.evaluate.submit'), $payload);

        $second->assertRedirect(route('portal.employee.dashboard'));
        $second->assertSessionHas('error');

        $count = DB::table('evaluation_submissions')
            ->where('evaluator_id', $ids['evaluator_id'])
            ->where('evaluatee_id', $ids['evaluatee_id'])
            ->where('school_year', '2026-2027')
            ->count();

        $this->assertSame(1, $count, 'duplicate submission should be blocked');
    }
}
