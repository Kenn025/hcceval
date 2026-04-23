<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create admin user
        User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'role' => 'admin',
            'password' => bcrypt('password'),
        ]);

        // Create super admin user
        User::factory()->create([
            'name' => 'Super Admin User',
            'email' => 'superadmin@example.com',
            'role' => 'super_admin',
            'password' => bcrypt('password'),
        ]);

        // Create branch admin user
        User::factory()->create([
            'name' => 'Branch Admin User',
            'email' => 'branchadmin@example.com',
            'role' => 'branch_admin',
            'password' => bcrypt('password'),
        ]);

        // Create overall branch admin user
        User::factory()->create([
            'name' => 'Overall Branch Admin User',
            'email' => 'overallbranchadmin@example.com',
            'role' => 'overall_branch_admin',
            'password' => bcrypt('password'),
        ]);

        // Create teacher user
        User::factory()->create([
            'name' => 'Teacher User',
            'email' => 'teacher@example.com',
            'role' => 'teacher',
            'password' => bcrypt('password'),
        ]);

        // Create student user
        User::factory()->create([
            'name' => 'Student User',
            'email' => 'student@example.com',
            'role' => 'student',
            'password' => bcrypt('password'),
        ]);

        // Optionally, create more users for testing
        User::factory(7)->create();
    }
}
