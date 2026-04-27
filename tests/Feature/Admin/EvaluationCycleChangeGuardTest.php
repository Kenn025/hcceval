<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EvaluationCycleChangeGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_academic_year_cannot_change_while_an_evaluation_window_is_open(): void
    {
        $user = User::factory()->create();
        $ids = $this->seedCyclesAndOpenWindow();

        $response = $this
            ->actingAs($user)
            ->withSession([
                'admin_role' => 'superadmin',
                'admin_branch_id' => null,
            ])
            ->put("/admin/evaluation-cycle/{$ids['next_cycle_id']}", [
                'year_start' => 2027,
                'year_end' => 2028,
                'semester' => '1st Sem',
                'status' => 'active',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');

        $this->assertDatabaseHas('academic_year', [
            'id' => $ids['active_cycle_id'],
            'is_activated' => 1,
        ]);

        $this->assertDatabaseHas('academic_year', [
            'id' => $ids['next_cycle_id'],
            'is_activated' => 0,
        ]);
    }

    public function test_academic_year_can_change_when_no_evaluation_window_is_open(): void
    {
        $user = User::factory()->create();
        $ids = $this->seedCyclesAndOpenWindow([
            'status' => 'closed',
            'date_closed' => now()->subMinute(),
        ]);

        $response = $this
            ->actingAs($user)
            ->withSession([
                'admin_role' => 'superadmin',
                'admin_branch_id' => null,
            ])
            ->put("/admin/evaluation-cycle/{$ids['next_cycle_id']}", [
                'year_start' => 2027,
                'year_end' => 2028,
                'semester' => '1st Sem',
                'status' => 'active',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('academic_year', [
            'id' => $ids['active_cycle_id'],
            'is_activated' => 0,
        ]);

        $this->assertDatabaseHas('academic_year', [
            'id' => $ids['next_cycle_id'],
            'is_activated' => 1,
        ]);
    }

    private function seedCyclesAndOpenWindow(array $windowOverrides = []): array
    {
        $branchId = (int) DB::table('branch')->insertGetId([
            'code' => 'GUARD-BR',
            'name' => 'Guard Branch',
            'address' => 'Test',
            'is_main' => 0,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $departmentId = (int) DB::table('department')->insertGetId([
            'code' => 'GUARD-DEP',
            'name' => 'Guard Department',
            'branch_id' => $branchId,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $activeCycleId = (int) DB::table('academic_year')->insertGetId([
            'from_year' => 2026,
            'to_year' => 2027,
            'term' => '2nd Sem',
            'is_activated' => 1,
            'is_deleted' => 0,
            'date_opened' => now()->subDay(),
            'date_closed' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $nextCycleId = (int) DB::table('academic_year')->insertGetId([
            'from_year' => 2027,
            'to_year' => 2028,
            'term' => '1st Sem',
            'is_activated' => 0,
            'is_deleted' => 0,
            'date_opened' => now()->subDay(),
            'date_closed' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('department_evaluation_windows')->insert(array_merge([
            'academic_year_id' => $activeCycleId,
            'branch_id' => $branchId,
            'department_id' => $departmentId,
            'status' => 'active',
            'date_opened' => now()->subMinute(),
            'date_closed' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ], $windowOverrides));

        return [
            'active_cycle_id' => $activeCycleId,
            'next_cycle_id' => $nextCycleId,
        ];
    }
}
