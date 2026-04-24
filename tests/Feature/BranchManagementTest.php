<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Branch;
use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BranchManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_overall_admin_can_create_a_branch_with_departments_and_admin_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->withSession([
                'admin_role' => 'overalladmin',
                'admin_branch_id' => 1,
            ])
            ->post('/admin/branches', [
                'name' => 'San Isidro Campus',
                'department_levels' => ['senior_high', 'college'],
                'admin_email' => 'admin.sanisidro@hcc.local',
                'admin_password' => 'secret123',
            ]);

        $response->assertRedirect();

        $branch = Branch::query()->where('name', 'San Isidro Campus')->first();

        $this->assertNotNull($branch);
        $this->assertSame('college', $branch->highest_department);
        $this->assertTrue($branch->is_activated);

        $this->assertDatabaseHas('admin', [
            'branch_id' => $branch->id,
            'role' => 'admin',
            'email' => 'admin.sanisidro@hcc.local',
        ]);

        $this->assertSame(4, Department::query()->where('branch_id', $branch->id)->count());

        $this->assertDatabaseHas('department', [
            'branch_id' => $branch->id,
            'name' => 'Senior High Department',
            'is_activated' => 1,
        ]);

        $this->assertDatabaseHas('department', [
            'branch_id' => $branch->id,
            'name' => 'Elementary Department',
            'is_activated' => 0,
        ]);
    }
}
