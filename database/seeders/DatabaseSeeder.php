<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        DB::table('ratings_employee')->delete();
        DB::table('ratings_head')->delete();
        DB::table('ratings_peer')->delete();
        DB::table('ratings_subject')->delete();
        DB::table('ratings_branch')->delete();
        DB::table('answer_questionnaires')->delete();
        DB::table('questionnaire_distribution')->delete();
        DB::table('questionnaires')->delete();
        DB::table('questionnaire_type')->delete();
        DB::table('question')->delete();
        DB::table('question_choices')->delete();
        DB::table('question_type')->delete();
        DB::table('question_class')->delete();
        DB::table('overall_ratings')->delete();

        DB::table('student')->delete();
        DB::table('employee')->delete();
        DB::table('employee_department')->delete();
        DB::table('teacher')->delete();
        DB::table('admin')->delete();
        DB::table('education_level')->delete();
        DB::table('subject')->delete();
        DB::table('strand')->delete();
        DB::table('program')->delete();
        DB::table('department')->delete();
        DB::table('academic_year')->delete();
        DB::table('branch')->delete();

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        DB::table('branch')->insert([
            [
                'id' => 1,
                'code' => 'OVERALL',
                'name' => 'Overall Branch',
                'address' => 'System Wide',
                'is_main' => 1,
                'highest_department' => null,
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
            [
                'id' => 2,
                'code' => 'HCC-SR',
                'name' => 'Holy Cross College Santa Rosa Nueva Ecija',
                'address' => 'Santa Rosa, Nueva Ecija',
                'is_main' => 0,
                'highest_department' => 'college',
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
            [
                'id' => 3,
                'code' => 'CHCC',
                'name' => 'Concepcion Holy Cross College',
                'address' => 'Concepcion, Tarlac',
                'is_main' => 0,
                'highest_department' => 'college',
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
        ]);

        DB::table('employee_department')->insert([
            ['id' => 1, 'branch_id' => null, 'code' => 'EMP-DEPT-UTILITY', 'name' => 'Utility', 'description' => 'Facilities, custodial, and general utility services.', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'branch_id' => null, 'code' => 'EMP-DEPT-RECORDS', 'name' => 'Records', 'description' => 'Records management and document processing.', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'branch_id' => null, 'code' => 'EMP-DEPT-REGISTRAR', 'name' => 'Registrar', 'description' => 'Student registration and enrollment services.', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'branch_id' => null, 'code' => 'EMP-DEPT-FINANCE', 'name' => 'Finance', 'description' => 'Finance and accounting operations.', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'branch_id' => null, 'code' => 'EMP-DEPT-CASHIER', 'name' => 'Cashier', 'description' => 'Payment collection and cashiering services.', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'branch_id' => null, 'code' => 'EMP-DEPT-GUIDANCE', 'name' => 'Guidance', 'description' => 'Guidance and counseling support.', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 7, 'branch_id' => null, 'code' => 'EMP-DEPT-LIBRARY', 'name' => 'Library', 'description' => 'Library services and learning resources.', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 8, 'branch_id' => null, 'code' => 'EMP-DEPT-IT', 'name' => 'Information Technology', 'description' => 'IT systems, network, and technical support.', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 9, 'branch_id' => null, 'code' => 'EMP-DEPT-HR', 'name' => 'Human Resources', 'description' => 'Personnel records and HR operations.', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 10, 'branch_id' => null, 'code' => 'EMP-DEPT-SECURITY', 'name' => 'Security', 'description' => 'Campus safety and security services.', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 11, 'branch_id' => null, 'code' => 'EMP-DEPT-CLINIC', 'name' => 'Clinic', 'description' => 'Health and clinic services.', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 12, 'branch_id' => null, 'code' => 'EMP-DEPT-MAINT', 'name' => 'Maintenance', 'description' => 'Building maintenance and repairs.', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 13, 'branch_id' => null, 'code' => 'EMP-DEPT-ADMIN', 'name' => 'Admin Office', 'description' => 'Administrative office support.', 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        $academicYears = [];
        $academicYearId = 1;

        for ($fromYear = 2025; $fromYear <= 2034; $fromYear++) {
            foreach (['1st Semester', '2nd Semester'] as $term) {
                $academicYears[] = [
                    'id' => $academicYearId++,
                    'from_year' => $fromYear,
                    'to_year' => $fromYear + 1,
                    'term' => $term,
                    'is_activated' => $fromYear === 2025 && $term === '2nd Semester' ? 1 : 0,
                    'is_deleted' => 0,
                ];
            }
        }

        DB::table('academic_year')->insert($academicYears);

        DB::table('department')->insert([
            ['id' => 1, 'code' => 'DEP-SR-COL', 'name' => 'College Department', 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'DEP-SR-SHS', 'name' => 'Senior High Department', 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'DEP-CHCC-COL', 'name' => 'College Department', 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'DEP-CHCC-SHS', 'name' => 'Senior High Department', 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'code' => 'DEP-SR-JHS', 'name' => 'Junior High Department', 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'code' => 'DEP-SR-ELEM', 'name' => 'Elementary Department', 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 7, 'code' => 'DEP-CHCC-JHS', 'name' => 'Junior High Department', 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 8, 'code' => 'DEP-CHCC-ELEM', 'name' => 'Elementary Department', 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('program')->insert([
            ['id' => 1, 'code' => 'BSIT-SR', 'name' => 'Bachelor of Science in Information Technology', 'department_id' => 1, 'duration_years' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'BSBA-SR', 'name' => 'Bachelor of Science in Business Administration', 'department_id' => 1, 'duration_years' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'BSED-SR', 'name' => 'Bachelor of Secondary Education', 'department_id' => 1, 'duration_years' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'BSCRIM-SR', 'name' => 'Bachelor of Science in Criminology', 'department_id' => 1, 'duration_years' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'code' => 'BSIT-CH', 'name' => 'Bachelor of Science in Information Technology', 'department_id' => 3, 'duration_years' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'code' => 'BSBA-CH', 'name' => 'Bachelor of Science in Business Administration', 'department_id' => 3, 'duration_years' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 7, 'code' => 'BSED-CH', 'name' => 'Bachelor of Secondary Education', 'department_id' => 3, 'duration_years' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 8, 'code' => 'BSCRIM-CH', 'name' => 'Bachelor of Science in Criminology', 'department_id' => 3, 'duration_years' => 4, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('strand')->insert([
            ['id' => 1, 'code' => 'STEM-SR', 'name' => 'Science, Technology, Engineering and Mathematics', 'department_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'ABM-SR', 'name' => 'Accountancy, Business and Management', 'department_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'HUMSS-SR', 'name' => 'Humanities and Social Sciences', 'department_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'GAS-SR', 'name' => 'General Academic Strand', 'department_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'code' => 'STEM-CH', 'name' => 'Science, Technology, Engineering and Mathematics', 'department_id' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'code' => 'ABM-CH', 'name' => 'Accountancy, Business and Management', 'department_id' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 7, 'code' => 'HUMSS-CH', 'name' => 'Humanities and Social Sciences', 'department_id' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 8, 'code' => 'GAS-CH', 'name' => 'General Academic Strand', 'department_id' => 4, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('education_level')->insert([
            ['id' => 1, 'code' => 'BSIT1-A-SR', 'department_id' => 1, 'program_id' => 1, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([1]), 'subject_id' => json_encode([1, 2]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'BSBA1-A-SR', 'department_id' => 1, 'program_id' => 2, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([2]), 'subject_id' => json_encode([3, 4]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'BSED1-A-SR', 'department_id' => 1, 'program_id' => 3, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([3]), 'subject_id' => json_encode([5]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'BSCRIM1-A-SR', 'department_id' => 1, 'program_id' => 4, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([4]), 'subject_id' => json_encode([6]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'code' => 'G11-STEM-A-SR', 'department_id' => 2, 'program_id' => null, 'year_level' => '11', 'section' => 'A', 'teacher_id' => json_encode([9]), 'subject_id' => json_encode([9]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'code' => 'G11-ABM-A-SR', 'department_id' => 2, 'program_id' => null, 'year_level' => '11', 'section' => 'A', 'teacher_id' => json_encode([10]), 'subject_id' => json_encode([10]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 7, 'code' => 'G7-A-SR', 'department_id' => 5, 'program_id' => null, 'year_level' => '7', 'section' => 'A', 'teacher_id' => json_encode([13]), 'subject_id' => json_encode([19]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 8, 'code' => 'G1-A-SR', 'department_id' => 6, 'program_id' => null, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([15]), 'subject_id' => json_encode([23]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 9, 'code' => 'BSIT1-A-CH', 'department_id' => 3, 'program_id' => 5, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([17]), 'subject_id' => json_encode([7, 8]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 10, 'code' => 'BSBA1-A-CH', 'department_id' => 3, 'program_id' => 6, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([18]), 'subject_id' => json_encode([11, 12]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 11, 'code' => 'BSED1-A-CH', 'department_id' => 3, 'program_id' => 7, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([19]), 'subject_id' => json_encode([13]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 12, 'code' => 'BSCRIM1-A-CH', 'department_id' => 3, 'program_id' => 8, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([20]), 'subject_id' => json_encode([14]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 13, 'code' => 'G11-STEM-A-CH', 'department_id' => 4, 'program_id' => null, 'year_level' => '11', 'section' => 'A', 'teacher_id' => json_encode([25]), 'subject_id' => json_encode([15]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 14, 'code' => 'G11-ABM-A-CH', 'department_id' => 4, 'program_id' => null, 'year_level' => '11', 'section' => 'A', 'teacher_id' => json_encode([26]), 'subject_id' => json_encode([16]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 15, 'code' => 'G7-A-CH', 'department_id' => 7, 'program_id' => null, 'year_level' => '7', 'section' => 'A', 'teacher_id' => json_encode([29]), 'subject_id' => json_encode([21]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 16, 'code' => 'G1-A-CH', 'department_id' => 8, 'program_id' => null, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([31]), 'subject_id' => json_encode([25]), 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('admin')->insert([
            ['id' => 1, 'code' => 'SUPERADMIN01', 'name' => 'Super Admin', 'role' => 'superadmin', 'branch_id' => 1, 'email' => 'superadmin@hcc.com', 'password' => md5('password'), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'OVERALLADMIN01', 'name' => 'Overall Admin', 'role' => 'overalladmin', 'branch_id' => 1, 'email' => 'overalladmin@hcc.com', 'password' => md5('password'), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'ADMIN-HCCSR', 'name' => 'Admin Santa Rosa', 'role' => 'admin', 'branch_id' => 2, 'email' => 'admin_sr@hcc.com', 'password' => md5('password'), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'ADMIN-CHCC', 'name' => 'Admin Concepcion', 'role' => 'admin', 'branch_id' => 3, 'email' => 'admin_chcc@hcc.com', 'password' => md5('password'), 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('teacher')->insert([
            ['id' => 1, 'code' => 'TCH-HCCSR-01', 'firstname' => 'Juan', 'middlename' => 'D', 'lastname' => 'Dela Cruz', 'role' => 'Program Chair', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000001', 'specialization' => 'Information Technology', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't1_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 1, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'TCH-HCCSR-02', 'firstname' => 'Maria', 'middlename' => 'L', 'lastname' => 'Santos', 'role' => 'Program Chair', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000002', 'specialization' => 'Business Administration', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't2_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 2, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'TCH-HCCSR-03', 'firstname' => 'Jose', 'middlename' => 'M', 'lastname' => 'Reyes', 'role' => 'Program Chair', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000003', 'specialization' => 'Education', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't3_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 3, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'TCH-HCCSR-04', 'firstname' => 'Ana', 'middlename' => 'K', 'lastname' => 'Garcia', 'role' => 'Program Chair', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000004', 'specialization' => 'Criminology', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't4_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 4, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'code' => 'TCH-HCCSR-05', 'firstname' => 'Ramon', 'middlename' => 'P', 'lastname' => 'Lopez', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000005', 'specialization' => 'Programming', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't5_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 1, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'code' => 'TCH-HCCSR-06', 'firstname' => 'Elaine', 'middlename' => 'Q', 'lastname' => 'Mendoza', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000006', 'specialization' => 'Accounting', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't6_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 2, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 7, 'code' => 'TCH-HCCSR-07', 'firstname' => 'Victor', 'middlename' => 'R', 'lastname' => 'Castro', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000007', 'specialization' => 'Pedagogy', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't7_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 3, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 8, 'code' => 'TCH-HCCSR-08', 'firstname' => 'Paula', 'middlename' => 'S', 'lastname' => 'Diaz', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000008', 'specialization' => 'Criminal Justice', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't8_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 4, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 9, 'code' => 'TCH-HCCSR-09', 'firstname' => 'Carlos', 'middlename' => 'T', 'lastname' => 'Rivera', 'role' => 'Adviser', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000009', 'specialization' => 'Mathematics', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't9_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 2, 'program_id' => null, 'strand_id' => 1, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 10, 'code' => 'TCH-HCCSR-10', 'firstname' => 'Diana', 'middlename' => 'U', 'lastname' => 'Flores', 'role' => 'Adviser', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000010', 'specialization' => 'Business', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't10_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 2, 'program_id' => null, 'strand_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 11, 'code' => 'TCH-HCCSR-11', 'firstname' => 'Helen', 'middlename' => 'V', 'lastname' => 'Torres', 'role' => 'Adviser', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000011', 'specialization' => 'Social Sciences', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't11_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 2, 'program_id' => null, 'strand_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 12, 'code' => 'TCH-HCCSR-12', 'firstname' => 'Mark', 'middlename' => 'W', 'lastname' => 'Navarro', 'role' => 'Adviser', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000012', 'specialization' => 'General Education', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't12_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 2, 'program_id' => null, 'strand_id' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 13, 'code' => 'TCH-HCCSR-13', 'firstname' => 'Nora', 'middlename' => 'X', 'lastname' => 'Cruz', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000013', 'specialization' => 'Junior High English', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't13_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 5, 'program_id' => null, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 14, 'code' => 'TCH-HCCSR-14', 'firstname' => 'Oscar', 'middlename' => 'Y', 'lastname' => 'Bautista', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000014', 'specialization' => 'Junior High Science', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't14_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 5, 'program_id' => null, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 15, 'code' => 'TCH-HCCSR-15', 'firstname' => 'Patricia', 'middlename' => 'Z', 'lastname' => 'Santos', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000015', 'specialization' => 'Elementary Reading', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't15_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 6, 'program_id' => null, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 16, 'code' => 'TCH-HCCSR-16', 'firstname' => 'Quentin', 'middlename' => 'A', 'lastname' => 'Reyes', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000016', 'specialization' => 'Elementary Mathematics', 'address' => 'Santa Rosa, Nueva Ecija']), 'email' => 't16_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 6, 'program_id' => null, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 17, 'code' => 'TCH-CHCC-01', 'firstname' => 'Carla', 'middlename' => 'A', 'lastname' => 'Mendoza', 'role' => 'Program Chair', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000017', 'specialization' => 'Information Technology', 'address' => 'Concepcion, Tarlac']), 'email' => 't1_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 5, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 18, 'code' => 'TCH-CHCC-02', 'firstname' => 'Brian', 'middlename' => 'B', 'lastname' => 'Torres', 'role' => 'Program Chair', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000018', 'specialization' => 'Business Administration', 'address' => 'Concepcion, Tarlac']), 'email' => 't2_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 6, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 19, 'code' => 'TCH-CHCC-03', 'firstname' => 'Liza', 'middlename' => 'C', 'lastname' => 'Aquino', 'role' => 'Program Chair', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000019', 'specialization' => 'Education', 'address' => 'Concepcion, Tarlac']), 'email' => 't3_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 7, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 20, 'code' => 'TCH-CHCC-04', 'firstname' => 'Paolo', 'middlename' => 'D', 'lastname' => 'Navarro', 'role' => 'Program Chair', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000020', 'specialization' => 'Criminology', 'address' => 'Concepcion, Tarlac']), 'email' => 't4_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 8, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 21, 'code' => 'TCH-CHCC-05', 'firstname' => 'Rica', 'middlename' => 'E', 'lastname' => 'Salazar', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000021', 'specialization' => 'Programming', 'address' => 'Concepcion, Tarlac']), 'email' => 't5_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 5, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 22, 'code' => 'TCH-CHCC-06', 'firstname' => 'Samuel', 'middlename' => 'F', 'lastname' => 'Garcia', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000022', 'specialization' => 'Accounting', 'address' => 'Concepcion, Tarlac']), 'email' => 't6_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 6, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 23, 'code' => 'TCH-CHCC-07', 'firstname' => 'Theresa', 'middlename' => 'G', 'lastname' => 'Domingo', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000023', 'specialization' => 'Pedagogy', 'address' => 'Concepcion, Tarlac']), 'email' => 't7_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 7, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 24, 'code' => 'TCH-CHCC-08', 'firstname' => 'Ulysses', 'middlename' => 'H', 'lastname' => 'Luna', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000024', 'specialization' => 'Criminal Justice', 'address' => 'Concepcion, Tarlac']), 'email' => 't8_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 8, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 25, 'code' => 'TCH-CHCC-09', 'firstname' => 'Vina', 'middlename' => 'I', 'lastname' => 'Mercado', 'role' => 'Adviser', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000025', 'specialization' => 'Mathematics', 'address' => 'Concepcion, Tarlac']), 'email' => 't9_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 4, 'program_id' => null, 'strand_id' => 5, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 26, 'code' => 'TCH-CHCC-10', 'firstname' => 'Wendy', 'middlename' => 'J', 'lastname' => 'Perez', 'role' => 'Adviser', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000026', 'specialization' => 'Business', 'address' => 'Concepcion, Tarlac']), 'email' => 't10_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 4, 'program_id' => null, 'strand_id' => 6, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 27, 'code' => 'TCH-CHCC-11', 'firstname' => 'Xander', 'middlename' => 'K', 'lastname' => 'Ramos', 'role' => 'Adviser', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000027', 'specialization' => 'Social Sciences', 'address' => 'Concepcion, Tarlac']), 'email' => 't11_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 4, 'program_id' => null, 'strand_id' => 7, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 28, 'code' => 'TCH-CHCC-12', 'firstname' => 'Yasmin', 'middlename' => 'L', 'lastname' => 'Fernandez', 'role' => 'Adviser', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000028', 'specialization' => 'General Education', 'address' => 'Concepcion, Tarlac']), 'email' => 't12_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 4, 'program_id' => null, 'strand_id' => 8, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 29, 'code' => 'TCH-CHCC-13', 'firstname' => 'Zoren', 'middlename' => 'M', 'lastname' => 'Castillo', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000029', 'specialization' => 'Junior High English', 'address' => 'Concepcion, Tarlac']), 'email' => 't13_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 7, 'program_id' => null, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 30, 'code' => 'TCH-CHCC-14', 'firstname' => 'Alma', 'middlename' => 'N', 'lastname' => 'Lim', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000030', 'specialization' => 'Junior High Science', 'address' => 'Concepcion, Tarlac']), 'email' => 't14_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 7, 'program_id' => null, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 31, 'code' => 'TCH-CHCC-15', 'firstname' => 'Benilda', 'middlename' => 'O', 'lastname' => 'Tolentino', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000031', 'specialization' => 'Elementary Reading', 'address' => 'Concepcion, Tarlac']), 'email' => 't15_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 8, 'program_id' => null, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 32, 'code' => 'TCH-CHCC-16', 'firstname' => 'Cesar', 'middlename' => 'P', 'lastname' => 'Valdez', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000032', 'specialization' => 'Elementary Mathematics', 'address' => 'Concepcion, Tarlac']), 'email' => 't16_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 8, 'program_id' => null, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('employee')->insert([
            ['id' => 1, 'code' => 'EMP-HCCSR-01', 'firstname' => 'Leo', 'middlename' => 'A', 'lastname' => 'Rivera', 'role' => 'Registrar', 'personal_info' => json_encode(['contact' => '09280000001', 'office' => 'Registrar']), 'email' => 'e1_sr@mail.com', 'password' => md5('password'), 'department_id' => 1, 'employee_department_id' => 3, 'program_id' => 1, 'strand_id' => null, 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'EMP-HCCSR-02', 'firstname' => 'Grace', 'middlename' => 'B', 'lastname' => 'Fernandez', 'role' => 'Cashier', 'personal_info' => json_encode(['contact' => '09280000002', 'office' => 'Finance']), 'email' => 'e2_sr@mail.com', 'password' => md5('password'), 'department_id' => 1, 'employee_department_id' => 5, 'program_id' => 2, 'strand_id' => null, 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'EMP-HCCSR-03', 'firstname' => 'Rico', 'middlename' => 'C', 'lastname' => 'Domingo', 'role' => 'Guidance Staff', 'personal_info' => json_encode(['contact' => '09280000003', 'office' => 'Guidance']), 'email' => 'e3_sr@mail.com', 'password' => md5('password'), 'department_id' => 2, 'employee_department_id' => 6, 'program_id' => null, 'strand_id' => 1, 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'EMP-HCCSR-04', 'firstname' => 'Sheena', 'middlename' => 'D', 'lastname' => 'Morales', 'role' => 'Librarian', 'personal_info' => json_encode(['contact' => '09280000004', 'office' => 'Library']), 'email' => 'e4_sr@mail.com', 'password' => md5('password'), 'department_id' => 6, 'employee_department_id' => 7, 'program_id' => null, 'strand_id' => null, 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'code' => 'EMP-CHCC-01', 'firstname' => 'Ian', 'middlename' => 'F', 'lastname' => 'Ramos', 'role' => 'Registrar', 'personal_info' => json_encode(['contact' => '09280000005', 'office' => 'Registrar']), 'email' => 'e1_chcc@mail.com', 'password' => md5('password'), 'department_id' => 3, 'employee_department_id' => 3, 'program_id' => 5, 'strand_id' => null, 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'code' => 'EMP-CHCC-02', 'firstname' => 'Joy', 'middlename' => 'G', 'lastname' => 'Salazar', 'role' => 'Cashier', 'personal_info' => json_encode(['contact' => '09280000006', 'office' => 'Finance']), 'email' => 'e2_chcc@mail.com', 'password' => md5('password'), 'department_id' => 3, 'employee_department_id' => 5, 'program_id' => 6, 'strand_id' => null, 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 7, 'code' => 'EMP-CHCC-03', 'firstname' => 'Ken', 'middlename' => 'H', 'lastname' => 'Bautista', 'role' => 'Guidance Staff', 'personal_info' => json_encode(['contact' => '09280000007', 'office' => 'Guidance']), 'email' => 'e3_chcc@mail.com', 'password' => md5('password'), 'department_id' => 4, 'employee_department_id' => 6, 'program_id' => null, 'strand_id' => 5, 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 8, 'code' => 'EMP-CHCC-04', 'firstname' => 'Lorna', 'middlename' => 'I', 'lastname' => 'Vega', 'role' => 'Librarian', 'personal_info' => json_encode(['contact' => '09280000008', 'office' => 'Library']), 'email' => 'e4_chcc@mail.com', 'password' => md5('password'), 'department_id' => 8, 'employee_department_id' => 7, 'program_id' => null, 'strand_id' => null, 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('subject')->insert([
            ['id' => 1, 'code' => 'SUB-BSIT-SR-01', 'name' => 'Introduction to Computing', 'type' => 'college', 'department_id' => 1, 'program_id' => 1, 'strand_id' => null, 'teacher_id' => json_encode([1, 5]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'SUB-BSIT-SR-02', 'name' => 'Computer Programming 1', 'type' => 'college', 'department_id' => 1, 'program_id' => 1, 'strand_id' => null, 'teacher_id' => json_encode([5]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'SUB-BSBA-SR-01', 'name' => 'Principles of Management', 'type' => 'college', 'department_id' => 1, 'program_id' => 2, 'strand_id' => null, 'teacher_id' => json_encode([2, 6]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'SUB-BSBA-SR-02', 'name' => 'Financial Accounting', 'type' => 'college', 'department_id' => 1, 'program_id' => 2, 'strand_id' => null, 'teacher_id' => json_encode([6]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'code' => 'SUB-BSED-SR-01', 'name' => 'Foundations of Education', 'type' => 'college', 'department_id' => 1, 'program_id' => 3, 'strand_id' => null, 'teacher_id' => json_encode([3, 7]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'code' => 'SUB-BSCRIM-SR-01', 'name' => 'Introduction to Criminology', 'type' => 'college', 'department_id' => 1, 'program_id' => 4, 'strand_id' => null, 'teacher_id' => json_encode([4, 8]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 7, 'code' => 'SUB-BSIT-CH-01', 'name' => 'Introduction to Computing', 'type' => 'college', 'department_id' => 3, 'program_id' => 5, 'strand_id' => null, 'teacher_id' => json_encode([17, 21]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 8, 'code' => 'SUB-BSIT-CH-02', 'name' => 'Computer Programming 1', 'type' => 'college', 'department_id' => 3, 'program_id' => 5, 'strand_id' => null, 'teacher_id' => json_encode([21]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 9, 'code' => 'SUB-STEM-SR-01', 'name' => 'General Mathematics', 'type' => 'shs', 'department_id' => 2, 'program_id' => null, 'strand_id' => 1, 'teacher_id' => json_encode([9]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 10, 'code' => 'SUB-ABM-SR-01', 'name' => 'Business Math', 'type' => 'shs', 'department_id' => 2, 'program_id' => null, 'strand_id' => 2, 'teacher_id' => json_encode([10]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 11, 'code' => 'SUB-BSBA-CH-01', 'name' => 'Organization and Management', 'type' => 'college', 'department_id' => 3, 'program_id' => 6, 'strand_id' => null, 'teacher_id' => json_encode([18, 22]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 12, 'code' => 'SUB-BSBA-CH-02', 'name' => 'Financial Accounting', 'type' => 'college', 'department_id' => 3, 'program_id' => 6, 'strand_id' => null, 'teacher_id' => json_encode([22]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 13, 'code' => 'SUB-BSED-CH-01', 'name' => 'Foundations of Education', 'type' => 'college', 'department_id' => 3, 'program_id' => 7, 'strand_id' => null, 'teacher_id' => json_encode([19, 23]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 14, 'code' => 'SUB-BSCRIM-CH-01', 'name' => 'Introduction to Criminology', 'type' => 'college', 'department_id' => 3, 'program_id' => 8, 'strand_id' => null, 'teacher_id' => json_encode([20, 24]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 15, 'code' => 'SUB-STEM-CH-01', 'name' => 'Pre-Calculus', 'type' => 'shs', 'department_id' => 4, 'program_id' => null, 'strand_id' => 5, 'teacher_id' => json_encode([25]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 16, 'code' => 'SUB-ABM-CH-01', 'name' => 'Fundamentals of ABM', 'type' => 'shs', 'department_id' => 4, 'program_id' => null, 'strand_id' => 6, 'teacher_id' => json_encode([26]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 17, 'code' => 'SUB-HUMSS-SR-01', 'name' => 'Philippine Politics and Governance', 'type' => 'shs', 'department_id' => 2, 'program_id' => null, 'strand_id' => 3, 'teacher_id' => json_encode([11]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 18, 'code' => 'SUB-GAS-SR-01', 'name' => 'Earth and Life Science', 'type' => 'shs', 'department_id' => 2, 'program_id' => null, 'strand_id' => 4, 'teacher_id' => json_encode([12]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 19, 'code' => 'SUB-JHS-SR-ENG-01', 'name' => 'English 7', 'type' => 'jhs', 'department_id' => 5, 'program_id' => null, 'strand_id' => null, 'teacher_id' => json_encode([13]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 20, 'code' => 'SUB-JHS-SR-SCI-01', 'name' => 'Science 8', 'type' => 'jhs', 'department_id' => 5, 'program_id' => null, 'strand_id' => null, 'teacher_id' => json_encode([14]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 21, 'code' => 'SUB-JHS-CH-ENG-01', 'name' => 'English 7', 'type' => 'jhs', 'department_id' => 7, 'program_id' => null, 'strand_id' => null, 'teacher_id' => json_encode([29]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 22, 'code' => 'SUB-JHS-CH-SCI-01', 'name' => 'Science 8', 'type' => 'jhs', 'department_id' => 7, 'program_id' => null, 'strand_id' => null, 'teacher_id' => json_encode([30]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 23, 'code' => 'SUB-ELEM-SR-ENG-01', 'name' => 'English 1', 'type' => 'elementary', 'department_id' => 6, 'program_id' => null, 'strand_id' => null, 'teacher_id' => json_encode([15]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 24, 'code' => 'SUB-ELEM-SR-MATH-01', 'name' => 'Mathematics 2', 'type' => 'elementary', 'department_id' => 6, 'program_id' => null, 'strand_id' => null, 'teacher_id' => json_encode([16]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 25, 'code' => 'SUB-ELEM-CH-ENG-01', 'name' => 'English 1', 'type' => 'elementary', 'department_id' => 8, 'program_id' => null, 'strand_id' => null, 'teacher_id' => json_encode([31]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 26, 'code' => 'SUB-ELEM-CH-MATH-01', 'name' => 'Mathematics 2', 'type' => 'elementary', 'department_id' => 8, 'program_id' => null, 'strand_id' => null, 'teacher_id' => json_encode([32]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('student')->insert([
            ['id' => 1, 'code' => 'STU-HCCSR-01', 'firstname' => 'Pedro', 'middlename' => 'A', 'lastname' => 'Penduko', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Juan Penduko', 'contact' => '09350000001']), 'email' => 's1_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 1, 'strand_id' => null, 'education_level_id' => 1, 'subject_id' => json_encode([1, 2]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'STU-HCCSR-02', 'firstname' => 'Juan', 'middlename' => 'B', 'lastname' => 'Dela Cruz', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Maria Dela Cruz', 'contact' => '09350000002']), 'email' => 's2_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 2, 'strand_id' => null, 'education_level_id' => 2, 'subject_id' => json_encode([3, 4]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'STU-HCCSR-03', 'firstname' => 'Maria', 'middlename' => 'C', 'lastname' => 'Clara', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Jose Clara', 'contact' => '09350000003']), 'email' => 's3_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 3, 'strand_id' => null, 'education_level_id' => 3, 'subject_id' => json_encode([5]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'STU-HCCSR-04', 'firstname' => 'Jose', 'middlename' => 'D', 'lastname' => 'Rizal', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Teodora Rizal', 'contact' => '09350000004']), 'email' => 's4_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 4, 'strand_id' => null, 'education_level_id' => 4, 'subject_id' => json_encode([6]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'code' => 'STU-HCCSR-05', 'firstname' => 'Andres', 'middlename' => 'E', 'lastname' => 'Bonifacio', 'personal_info' => json_encode(['year' => '11', 'guardian' => 'Catalina Bonifacio', 'contact' => '09350000005']), 'email' => 's5_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 2, 'program_id' => null, 'strand_id' => 1, 'education_level_id' => 5, 'subject_id' => json_encode([9]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'code' => 'STU-HCCSR-06', 'firstname' => 'Lucia', 'middlename' => 'F', 'lastname' => 'Mercado', 'personal_info' => json_encode(['year' => '11', 'guardian' => 'Mario Mercado', 'contact' => '09350000006']), 'email' => 's6_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 2, 'program_id' => null, 'strand_id' => 2, 'education_level_id' => 6, 'subject_id' => json_encode([10]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 7, 'code' => 'STU-HCCSR-07', 'firstname' => 'Miguel', 'middlename' => 'G', 'lastname' => 'Santos', 'personal_info' => json_encode(['year' => '7', 'guardian' => 'Nena Santos', 'contact' => '09350000007']), 'email' => 's7_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 5, 'program_id' => null, 'strand_id' => null, 'education_level_id' => 7, 'subject_id' => json_encode([19]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 8, 'code' => 'STU-HCCSR-08', 'firstname' => 'Nina', 'middlename' => 'H', 'lastname' => 'Lopez', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Paul Lopez', 'contact' => '09350000008']), 'email' => 's8_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 6, 'program_id' => null, 'strand_id' => null, 'education_level_id' => 8, 'subject_id' => json_encode([23]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 9, 'code' => 'STU-CHCC-01', 'firstname' => 'Liza', 'middlename' => 'A', 'lastname' => 'Soberano', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'John Soberano', 'contact' => '09350000009']), 'email' => 's1_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 5, 'strand_id' => null, 'education_level_id' => 9, 'subject_id' => json_encode([7, 8]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 10, 'code' => 'STU-CHCC-02', 'firstname' => 'Enrique', 'middlename' => 'B', 'lastname' => 'Gil', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Robert Gil', 'contact' => '09350000010']), 'email' => 's2_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 6, 'strand_id' => null, 'education_level_id' => 10, 'subject_id' => json_encode([11, 12]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 11, 'code' => 'STU-CHCC-03', 'firstname' => 'Daniel', 'middlename' => 'C', 'lastname' => 'Padilla', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Carlos Padilla', 'contact' => '09350000011']), 'email' => 's3_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 7, 'strand_id' => null, 'education_level_id' => 11, 'subject_id' => json_encode([13]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 12, 'code' => 'STU-CHCC-04', 'firstname' => 'Kathryn', 'middlename' => 'D', 'lastname' => 'Bernardo', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Min Bernardo', 'contact' => '09350000012']), 'email' => 's4_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 8, 'strand_id' => null, 'education_level_id' => 12, 'subject_id' => json_encode([14]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 13, 'code' => 'STU-CHCC-05', 'firstname' => 'Nadine', 'middlename' => 'E', 'lastname' => 'Lustre', 'personal_info' => json_encode(['year' => '11', 'guardian' => 'Ulysses Lustre', 'contact' => '09350000013']), 'email' => 's5_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 4, 'program_id' => null, 'strand_id' => 5, 'education_level_id' => 13, 'subject_id' => json_encode([15]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 14, 'code' => 'STU-CHCC-06', 'firstname' => 'Owen', 'middlename' => 'F', 'lastname' => 'Aquino', 'personal_info' => json_encode(['year' => '11', 'guardian' => 'Rina Aquino', 'contact' => '09350000014']), 'email' => 's6_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 4, 'program_id' => null, 'strand_id' => 6, 'education_level_id' => 14, 'subject_id' => json_encode([16]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 15, 'code' => 'STU-CHCC-07', 'firstname' => 'Paige', 'middlename' => 'G', 'lastname' => 'Rivera', 'personal_info' => json_encode(['year' => '7', 'guardian' => 'Nestor Rivera', 'contact' => '09350000015']), 'email' => 's7_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 7, 'program_id' => null, 'strand_id' => null, 'education_level_id' => 15, 'subject_id' => json_encode([21]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 16, 'code' => 'STU-CHCC-08', 'firstname' => 'Queenie', 'middlename' => 'H', 'lastname' => 'Mora', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Rogelio Mora', 'contact' => '09350000016']), 'email' => 's8_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 8, 'program_id' => null, 'strand_id' => null, 'education_level_id' => 16, 'subject_id' => json_encode([25]), 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('question_class')->insert([
            ['id' => 1, 'branch_id' => 1, 'code' => 'QC-01', 'name' => 'Professionalism', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'branch_id' => 1, 'code' => 'QC-02', 'name' => 'Room Management', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'branch_id' => 1, 'code' => 'QC-03', 'name' => 'Attitude', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'branch_id' => 1, 'code' => 'QC-04', 'name' => 'Communication', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'branch_id' => 1, 'code' => 'QC-05', 'name' => 'Instructional Delivery', 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('question_type')->insert([
            ['id' => 1, 'branch_id' => 1, 'code' => 'QT-01', 'name' => 'Scale', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'branch_id' => 1, 'code' => 'QT-02', 'name' => 'Comment', 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('question_choices')->insert([
            ['id' => 1, 'branch_id' => 1, 'code' => 'QCH-05', 'name' => '5-Point Likert Scale', 'quantity' => 5, 'verbal_interpretation' => json_encode(['1' => 'Poor', '2' => 'Fair', '3' => 'Good', '4' => 'Very Good', '5' => 'Excellent']), 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('question')->insert([
            ['id' => 1, 'branch_id' => 1, 'code' => 'Q-001', 'description' => 'The instructor comes to class prepared.', 'question_class_id' => 1, 'question_type_id' => 1, 'is_required' => 1, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'branch_id' => 1, 'code' => 'Q-002', 'description' => 'The instructor discusses the lessons clearly.', 'question_class_id' => 5, 'question_type_id' => 1, 'is_required' => 1, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'branch_id' => 1, 'code' => 'Q-003', 'description' => 'Additional comments or suggestions.', 'question_class_id' => 3, 'question_type_id' => 2, 'is_required' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'branch_id' => 1, 'code' => 'Q-004', 'description' => 'The instructor manages classroom time effectively.', 'question_class_id' => 2, 'question_type_id' => 1, 'is_required' => 1, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'branch_id' => 1, 'code' => 'Q-005', 'description' => 'The instructor communicates respectfully with students.', 'question_class_id' => 4, 'question_type_id' => 1, 'is_required' => 1, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'branch_id' => 1, 'code' => 'Q-006', 'description' => 'The teacher shows professionalism in class and school activities.', 'question_class_id' => 1, 'question_type_id' => 1, 'is_required' => 1, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('questionnaire_type')->insert([
            ['id' => 1, 'branch_id' => 1, 'code' => 'QTYPE-SUBJECT', 'name' => 'Subject Teacher Evaluation Form', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'branch_id' => 1, 'code' => 'QTYPE-PEER', 'name' => 'Peer to Peer Evaluation Form', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'branch_id' => 1, 'code' => 'QTYPE-HEAD', 'name' => 'School Heads Evaluation Form', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'branch_id' => 1, 'code' => 'QTYPE-EMPLOYEE', 'name' => 'Employee Feedback Evaluation Form', 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('questionnaires')->insert([
            [
                'id' => 1,
                'branch_id' => 2,
                'code' => 'QUES-001',
                'title' => 'Santa Rosa Teacher Evaluation Form',
                'questionnaire_type_id' => 1,
                'question_choices_id' => 1,
                'items' => json_encode([
                    'scale_questions' => [
                        [
                            'class_name' => 'Professionalism',
                            'weight_percentage' => 30,
                            'questions' => [1, 6],
                        ],
                        [
                            'class_name' => 'Instructional Delivery',
                            'weight_percentage' => 30,
                            'questions' => [2],
                        ],
                        [
                            'class_name' => 'Room Management',
                            'weight_percentage' => 20,
                            'questions' => [4],
                        ],
                        [
                            'class_name' => 'Communication',
                            'weight_percentage' => 20,
                            'questions' => [5],
                        ],
                    ],
                    'comment_section' => [
                        'questions' => [
                            ['question_id' => 3],
                        ],
                    ],
                ]),
                'comments' => json_encode([3]),
                'notes' => 'Default teacher evaluation questionnaire for the current evaluation cycle.',
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
            [
                'id' => 2,
                'branch_id' => 3,
                'code' => 'QUES-002',
                'title' => 'Concepcion Teacher Evaluation Form',
                'questionnaire_type_id' => 1,
                'question_choices_id' => 1,
                'items' => json_encode([
                    'scale_questions' => [
                        [
                            'class_name' => 'Professionalism',
                            'weight_percentage' => 35,
                            'questions' => [1, 6],
                        ],
                        [
                            'class_name' => 'Instructional Delivery',
                            'weight_percentage' => 35,
                            'questions' => [2],
                        ],
                        [
                            'class_name' => 'Communication',
                            'weight_percentage' => 30,
                            'questions' => [5],
                        ],
                    ],
                    'comment_section' => [
                        'questions' => [
                            ['question_id' => 3],
                        ],
                    ],
                ]),
                'comments' => json_encode([3]),
                'notes' => 'Baseline evaluation questionnaire seeded for Concepcion branch.',
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
            [
                'id' => 3,
                'branch_id' => 2,
                'code' => 'QUES-PEER-SR',
                'title' => 'Santa Rosa Peer to Peer Evaluation Form',
                'questionnaire_type_id' => 2,
                'question_choices_id' => 1,
                'items' => json_encode([
                    'scale_questions' => [
                        [
                            'class_name' => 'Professionalism',
                            'weight_percentage' => 30,
                            'questions' => [1, 6],
                        ],
                        [
                            'class_name' => 'Instructional Delivery',
                            'weight_percentage' => 30,
                            'questions' => [2],
                        ],
                        [
                            'class_name' => 'Room Management',
                            'weight_percentage' => 20,
                            'questions' => [4],
                        ],
                        [
                            'class_name' => 'Communication',
                            'weight_percentage' => 20,
                            'questions' => [5],
                        ],
                    ],
                    'comment_section' => [
                        'questions' => [
                            ['question_id' => 3],
                        ],
                    ],
                ]),
                'comments' => json_encode([3]),
                'notes' => 'Default peer-to-peer evaluation questionnaire for Santa Rosa branch.',
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
            [
                'id' => 4,
                'branch_id' => 3,
                'code' => 'QUES-PEER-CH',
                'title' => 'Concepcion Peer to Peer Evaluation Form',
                'questionnaire_type_id' => 2,
                'question_choices_id' => 1,
                'items' => json_encode([
                    'scale_questions' => [
                        [
                            'class_name' => 'Professionalism',
                            'weight_percentage' => 35,
                            'questions' => [1, 6],
                        ],
                        [
                            'class_name' => 'Instructional Delivery',
                            'weight_percentage' => 35,
                            'questions' => [2],
                        ],
                        [
                            'class_name' => 'Communication',
                            'weight_percentage' => 30,
                            'questions' => [5],
                        ],
                    ],
                    'comment_section' => [
                        'questions' => [
                            ['question_id' => 3],
                        ],
                    ],
                ]),
                'comments' => json_encode([3]),
                'notes' => 'Default peer-to-peer evaluation questionnaire for Concepcion branch.',
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
            [
                'id' => 5,
                'branch_id' => 2,
                'code' => 'QUES-HEAD-SR',
                'title' => 'Santa Rosa School Heads Evaluation Form',
                'questionnaire_type_id' => 3,
                'question_choices_id' => 1,
                'items' => json_encode([
                    'scale_questions' => [
                        [
                            'class_name' => 'Professionalism',
                            'weight_percentage' => 35,
                            'questions' => [1, 6],
                        ],
                        [
                            'class_name' => 'Instructional Leadership',
                            'weight_percentage' => 35,
                            'questions' => [2, 4],
                        ],
                        [
                            'class_name' => 'Communication',
                            'weight_percentage' => 30,
                            'questions' => [5],
                        ],
                    ],
                    'comment_section' => [
                        'questions' => [
                            ['question_id' => 3],
                        ],
                    ],
                ]),
                'comments' => json_encode([3]),
                'notes' => 'Default school-head evaluation questionnaire for Santa Rosa branch.',
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
            [
                'id' => 6,
                'branch_id' => 3,
                'code' => 'QUES-HEAD-CH',
                'title' => 'Concepcion School Heads Evaluation Form',
                'questionnaire_type_id' => 3,
                'question_choices_id' => 1,
                'items' => json_encode([
                    'scale_questions' => [
                        [
                            'class_name' => 'Professionalism',
                            'weight_percentage' => 35,
                            'questions' => [1, 6],
                        ],
                        [
                            'class_name' => 'Instructional Leadership',
                            'weight_percentage' => 35,
                            'questions' => [2, 4],
                        ],
                        [
                            'class_name' => 'Communication',
                            'weight_percentage' => 30,
                            'questions' => [5],
                        ],
                    ],
                    'comment_section' => [
                        'questions' => [
                            ['question_id' => 3],
                        ],
                    ],
                ]),
                'comments' => json_encode([3]),
                'notes' => 'Default school-head evaluation questionnaire for Concepcion branch.',
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
            [
                'id' => 7,
                'branch_id' => 2,
                'code' => 'QUES-EMP-SR',
                'title' => 'Santa Rosa Employee Feedback Evaluation Form',
                'questionnaire_type_id' => 4,
                'question_choices_id' => 1,
                'items' => json_encode([
                    'scale_questions' => [
                        [
                            'class_name' => 'Professionalism',
                            'weight_percentage' => 35,
                            'questions' => [1, 6],
                        ],
                        [
                            'class_name' => 'Service Delivery',
                            'weight_percentage' => 35,
                            'questions' => [2, 4],
                        ],
                        [
                            'class_name' => 'Communication',
                            'weight_percentage' => 30,
                            'questions' => [5],
                        ],
                    ],
                    'comment_section' => [
                        'questions' => [
                            ['question_id' => 3],
                        ],
                    ],
                ]),
                'comments' => json_encode([3]),
                'notes' => 'Default employee feedback questionnaire for Santa Rosa branch.',
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
            [
                'id' => 8,
                'branch_id' => 3,
                'code' => 'QUES-EMP-CH',
                'title' => 'Concepcion Employee Feedback Evaluation Form',
                'questionnaire_type_id' => 4,
                'question_choices_id' => 1,
                'items' => json_encode([
                    'scale_questions' => [
                        [
                            'class_name' => 'Professionalism',
                            'weight_percentage' => 35,
                            'questions' => [1, 6],
                        ],
                        [
                            'class_name' => 'Service Delivery',
                            'weight_percentage' => 35,
                            'questions' => [2, 4],
                        ],
                        [
                            'class_name' => 'Communication',
                            'weight_percentage' => 30,
                            'questions' => [5],
                        ],
                    ],
                    'comment_section' => [
                        'questions' => [
                            ['question_id' => 3],
                        ],
                    ],
                ]),
                'comments' => json_encode([3]),
                'notes' => 'Default employee feedback questionnaire for Concepcion branch.',
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
        ]);

        DB::table('questionnaire_distribution')->insert([
            ['id' => 1, 'branch_id' => 2, 'code' => 'QD-001', 'questionnaire_id' => 1, 'academic_year_id' => 1, 'items' => json_encode([1, 2, 3, 4, 5, 6]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'branch_id' => 3, 'code' => 'QD-002', 'questionnaire_id' => 2, 'academic_year_id' => 1, 'items' => json_encode([9, 10, 11, 12, 13, 14]), 'is_activated' => 1, 'is_deleted' => 0],
        ]);
    }
}
