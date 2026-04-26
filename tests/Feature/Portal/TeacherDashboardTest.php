<?php

namespace Tests\Feature\Portal;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TeacherDashboardTest extends TestCase
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

    public function test_teacher_dashboard_shows_legacy_program_assignment_cards(): void
    {
        $branchId = (int) DB::table('branch')->insertGetId([
            'code' => 'CHCC-T',
            'name' => 'Concepcion Test Branch',
            'address' => 'Test',
            'is_main' => 0,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $departmentId = (int) DB::table('department')->insertGetId([
            'code' => 'DEP-COL-T',
            'name' => 'College Department',
            'branch_id' => $branchId,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $programId = (int) DB::table('program')->insertGetId([
            'code' => 'BSED-T',
            'name' => 'Bachelor of Secondary Education',
            'department_id' => $departmentId,
            'duration_years' => 4,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('academic_year')->insert([
            'from_year' => 2026,
            'to_year' => 2027,
            'term' => '2nd Sem',
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $teacherId = (int) DB::table('teacher')->insertGetId([
            'code' => 'TCH-CHCC-07',
            'firstname' => 'Theresa',
            'middlename' => 'G',
            'lastname' => 'Domingo',
            'email' => 'theresa@example.com',
            'password' => bcrypt('secret'),
            'role' => 'Teacher',
            'branch_id' => $branchId,
            'department_id' => $departmentId,
            'program_id' => $programId,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $subjectId = (int) DB::table('subject')->insertGetId([
            'code' => 'SUB-BSED-01',
            'name' => 'Foundations of Education',
            'type' => 'college',
            'department_id' => $departmentId,
            'program_id' => $programId,
            'teacher_id' => json_encode([$teacherId]),
            'is_gened' => 0,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $levelId = (int) DB::table('education_level')->insertGetId([
            'code' => 'BSED1-A-T',
            'department_id' => $departmentId,
            'program_id' => $programId,
            'year_level' => '1',
            'section' => 'A',
            'teacher_id' => json_encode([]),
            'subject_id' => json_encode([$subjectId]),
            'subject_teacher_map' => json_encode([(string) $subjectId => $teacherId]),
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('student')->insert([
            [
                'code' => 'STU-001',
                'firstname' => 'Ana',
                'lastname' => 'Student',
                'email' => 'ana@example.com',
                'password' => bcrypt('secret'),
                'branch_id' => $branchId,
                'department_id' => $departmentId,
                'program_id' => $programId,
                'education_level_id' => $levelId,
                'is_activated' => 1,
                'is_deleted' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'STU-002',
                'firstname' => 'Ben',
                'lastname' => 'Student',
                'email' => 'ben@example.com',
                'password' => bcrypt('secret'),
                'branch_id' => $branchId,
                'department_id' => $departmentId,
                'program_id' => $programId,
                'education_level_id' => $levelId,
                'is_activated' => 1,
                'is_deleted' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $response = $this->asTeacher($teacherId)
            ->get(route('portal.teacher.dashboard'))
            ->assertOk();

        $classes = collect(data_get($response->viewData('page'), 'props.classes', []));

        $this->assertTrue(
            $classes->contains(fn (array $class) => $class['course_name'] === 'Foundations of Education'),
            'Expected the teacher dashboard classes prop to include Foundations of Education.'
        );
        $this->assertTrue(
            $classes->contains(fn (array $class) => $class['scope_label'] === 'Bachelor of Secondary Education'),
            'Expected the teacher dashboard classes prop to include the BSED scope label.'
        );
        $this->assertTrue(
            $classes->contains(fn (array $class) => (int) $class['enrolled_count'] === 2),
            'Expected the teacher dashboard classes prop to include 2 enrolled students.'
        );
    }
}
