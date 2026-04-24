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
        DB::table('teacher')->delete();
        DB::table('admin')->delete();
        DB::table('education_level')->delete();
        DB::table('subject')->delete();
        DB::table('strand')->delete();
        DB::table('program')->delete();
        DB::table('department')->delete();
        DB::table('academic_year')->delete();
        DB::table('branch')->delete();

        DB::statement('ALTER TABLE ratings_employee AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE ratings_head AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE ratings_peer AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE ratings_subject AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE ratings_branch AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE answer_questionnaires AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE questionnaire_distribution AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE questionnaires AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE questionnaire_type AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE question AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE question_choices AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE question_type AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE question_class AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE overall_ratings AUTO_INCREMENT = 1');

        DB::statement('ALTER TABLE student AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE employee AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE teacher AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE admin AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE education_level AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE subject AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE strand AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE program AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE department AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE academic_year AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE branch AUTO_INCREMENT = 1');

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        DB::table('branch')->insert([
            [
                'id' => 1,
                'code' => 'OVERALL',
                'name' => 'Overall Branch',
                'address' => 'System Wide',
                'is_main' => 1,
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
            [
                'id' => 2,
                'code' => 'HCC-SR',
                'name' => 'Holy Cross College Santa Rosa Nueva Ecija',
                'address' => 'Santa Rosa, Nueva Ecija',
                'is_main' => 0,
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
            [
                'id' => 3,
                'code' => 'CHCC',
                'name' => 'Concepcion Holy Cross College',
                'address' => 'Concepcion, Tarlac',
                'is_main' => 0,
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
        ]);

        DB::table('academic_year')->insert([
            ['id' => 1, 'from_year' => 2025, 'to_year' => 2026, 'term' => '1st Semester', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'from_year' => 2025, 'to_year' => 2026, 'term' => '2nd Semester', 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('department')->insert([
            ['id' => 1, 'code' => 'DEP-SR-COL', 'name' => 'College Department - Santa Rosa', 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'DEP-SR-SHS', 'name' => 'Senior High Department - Santa Rosa', 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'DEP-CHCC-COL', 'name' => 'College Department - Concepcion', 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'DEP-CHCC-SHS', 'name' => 'Senior High Department - Concepcion', 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('program')->insert([
            ['id' => 1, 'code' => 'BSIT-SR', 'name' => 'Bachelor of Science in Information Technology', 'department_id' => 1, 'duration_years' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'BSBA-SR', 'name' => 'Bachelor of Science in Business Administration', 'department_id' => 1, 'duration_years' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'BSIT-CH', 'name' => 'Bachelor of Science in Information Technology', 'department_id' => 3, 'duration_years' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'BSBA-CH', 'name' => 'Bachelor of Science in Business Administration', 'department_id' => 3, 'duration_years' => 4, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('strand')->insert([
            ['id' => 1, 'code' => 'STEM-SR', 'name' => 'Science, Technology, Engineering and Mathematics', 'department_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'ABM-SR', 'name' => 'Accountancy, Business and Management', 'department_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'STEM-CH', 'name' => 'Science, Technology, Engineering and Mathematics', 'department_id' => 4, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'ABM-CH', 'name' => 'Accountancy, Business and Management', 'department_id' => 4, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('education_level')->insert([
            ['id' => 1, 'code' => 'BSIT1-A-SR', 'department_id' => 1, 'program_id' => 1, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([]), 'subject_id' => json_encode([]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'BSBA1-A-SR', 'department_id' => 1, 'program_id' => 2, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([]), 'subject_id' => json_encode([]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'BSIT1-A-CH', 'department_id' => 3, 'program_id' => 3, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([]), 'subject_id' => json_encode([]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'BSBA1-A-CH', 'department_id' => 3, 'program_id' => 4, 'year_level' => '1', 'section' => 'A', 'teacher_id' => json_encode([]), 'subject_id' => json_encode([]), 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('admin')->insert([
            ['id' => 1, 'code' => 'SUPERADMIN01', 'name' => 'Super Admin', 'role' => 'superadmin', 'branch_id' => 1, 'email' => 'superadmin@hcc.com', 'password' => md5('password'), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'OVERALLADMIN01', 'name' => 'Overall Admin', 'role' => 'overalladmin', 'branch_id' => 1, 'email' => 'overalladmin@hcc.com', 'password' => md5('password'), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'ADMIN-HCCSR', 'name' => 'Admin Santa Rosa', 'role' => 'admin', 'branch_id' => 2, 'email' => 'admin_sr@hcc.com', 'password' => md5('password'), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'ADMIN-CHCC', 'name' => 'Admin Concepcion', 'role' => 'admin', 'branch_id' => 3, 'email' => 'admin_chcc@hcc.com', 'password' => md5('password'), 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('teacher')->insert([
            ['id' => 1, 'code' => 'TCH-HCCSR-01', 'firstname' => 'Juan', 'middlename' => 'D', 'lastname' => 'Dela Cruz', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000001']), 'email' => 't1_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 1, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'TCH-HCCSR-02', 'firstname' => 'Maria', 'middlename' => 'L', 'lastname' => 'Santos', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000002']), 'email' => 't2_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 2, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'TCH-HCCSR-03', 'firstname' => 'Jose', 'middlename' => 'M', 'lastname' => 'Reyes', 'role' => 'Program Chair', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000003']), 'email' => 't3_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 2, 'program_id' => null, 'strand_id' => 1, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'TCH-HCCSR-04', 'firstname' => 'Ana', 'middlename' => 'K', 'lastname' => 'Garcia', 'role' => 'Program Chair', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000004']), 'email' => 't4_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 2, 'program_id' => null, 'strand_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'code' => 'TCH-CHCC-01', 'firstname' => 'Carla', 'middlename' => 'A', 'lastname' => 'Mendoza', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000005']), 'email' => 't1_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 3, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'code' => 'TCH-CHCC-02', 'firstname' => 'Brian', 'middlename' => 'B', 'lastname' => 'Torres', 'role' => 'Teacher', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000006']), 'email' => 't2_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 4, 'strand_id' => null, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 7, 'code' => 'TCH-CHCC-03', 'firstname' => 'Liza', 'middlename' => 'C', 'lastname' => 'Aquino', 'role' => 'Program Chair', 'personal_info' => json_encode(['gender' => 'Female', 'contact' => '09170000007']), 'email' => 't3_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 4, 'program_id' => null, 'strand_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 8, 'code' => 'TCH-CHCC-04', 'firstname' => 'Paolo', 'middlename' => 'D', 'lastname' => 'Navarro', 'role' => 'Program Chair', 'personal_info' => json_encode(['gender' => 'Male', 'contact' => '09170000008']), 'email' => 't4_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 4, 'program_id' => null, 'strand_id' => 4, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('employee')->insert([
            ['id' => 1, 'code' => 'EMP-HCCSR-01', 'firstname' => 'Leo', 'middlename' => 'A', 'lastname' => 'Rivera', 'role' => 'Registrar', 'personal_info' => json_encode(['contact' => '09280000001']), 'email' => 'e1_sr@mail.com', 'password' => md5('password'), 'department_id' => 1, 'program_id' => 1, 'strand_id' => null, 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'EMP-HCCSR-02', 'firstname' => 'Grace', 'middlename' => 'B', 'lastname' => 'Fernandez', 'role' => 'Cashier', 'personal_info' => json_encode(['contact' => '09280000002']), 'email' => 'e2_sr@mail.com', 'password' => md5('password'), 'department_id' => 1, 'program_id' => 2, 'strand_id' => null, 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'EMP-HCCSR-03', 'firstname' => 'Rico', 'middlename' => 'C', 'lastname' => 'Domingo', 'role' => 'Guidance Staff', 'personal_info' => json_encode(['contact' => '09280000003']), 'email' => 'e3_sr@mail.com', 'password' => md5('password'), 'department_id' => 2, 'program_id' => null, 'strand_id' => 1, 'branch_id' => 2, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'EMP-CHCC-01', 'firstname' => 'Ian', 'middlename' => 'F', 'lastname' => 'Ramos', 'role' => 'Registrar', 'personal_info' => json_encode(['contact' => '09280000004']), 'email' => 'e1_chcc@mail.com', 'password' => md5('password'), 'department_id' => 3, 'program_id' => 3, 'strand_id' => null, 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'code' => 'EMP-CHCC-02', 'firstname' => 'Joy', 'middlename' => 'G', 'lastname' => 'Salazar', 'role' => 'Cashier', 'personal_info' => json_encode(['contact' => '09280000005']), 'email' => 'e2_chcc@mail.com', 'password' => md5('password'), 'department_id' => 3, 'program_id' => 4, 'strand_id' => null, 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'code' => 'EMP-CHCC-03', 'firstname' => 'Ken', 'middlename' => 'H', 'lastname' => 'Bautista', 'role' => 'Guidance Staff', 'personal_info' => json_encode(['contact' => '09280000006']), 'email' => 'e3_chcc@mail.com', 'password' => md5('password'), 'department_id' => 4, 'program_id' => null, 'strand_id' => 3, 'branch_id' => 3, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('subject')->insert([
            ['id' => 1, 'code' => 'SUB-BSIT-SR-01', 'name' => 'Introduction to Computing', 'type' => 'college', 'department_id' => 1, 'program_id' => 1, 'strand_id' => null, 'teacher_id' => json_encode([1]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'SUB-BSBA-SR-01', 'name' => 'Principles of Management', 'type' => 'college', 'department_id' => 1, 'program_id' => 2, 'strand_id' => null, 'teacher_id' => json_encode([2]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'SUB-STEM-SR-01', 'name' => 'General Mathematics', 'type' => 'shs', 'department_id' => 2, 'program_id' => null, 'strand_id' => 1, 'teacher_id' => json_encode([3]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'SUB-ABM-SR-01', 'name' => 'Business Math', 'type' => 'shs', 'department_id' => 2, 'program_id' => null, 'strand_id' => 2, 'teacher_id' => json_encode([4]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'code' => 'SUB-BSIT-CH-01', 'name' => 'Computer Programming 1', 'type' => 'college', 'department_id' => 3, 'program_id' => 3, 'strand_id' => null, 'teacher_id' => json_encode([5]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'code' => 'SUB-BSBA-CH-01', 'name' => 'Organization and Management', 'type' => 'college', 'department_id' => 3, 'program_id' => 4, 'strand_id' => null, 'teacher_id' => json_encode([6]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 7, 'code' => 'SUB-STEM-CH-01', 'name' => 'Pre-Calculus', 'type' => 'shs', 'department_id' => 4, 'program_id' => null, 'strand_id' => 3, 'teacher_id' => json_encode([7]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 8, 'code' => 'SUB-ABM-CH-01', 'name' => 'Fundamentals of ABM', 'type' => 'shs', 'department_id' => 4, 'program_id' => null, 'strand_id' => 4, 'teacher_id' => json_encode([8]), 'is_gened' => 0, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('education_level')->where('id', 1)->update(['teacher_id' => json_encode([1]), 'subject_id' => json_encode([1])]);
        DB::table('education_level')->where('id', 2)->update(['teacher_id' => json_encode([2]), 'subject_id' => json_encode([2])]);
        DB::table('education_level')->where('id', 3)->update(['teacher_id' => json_encode([5]), 'subject_id' => json_encode([5])]);
        DB::table('education_level')->where('id', 4)->update(['teacher_id' => json_encode([6]), 'subject_id' => json_encode([6])]);

        DB::table('student')->insert([
            ['id' => 1, 'code' => 'STU-HCCSR-01', 'firstname' => 'Pedro', 'middlename' => 'A', 'lastname' => 'Penduko', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Juan Penduko']), 'email' => 's1_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 1, 'strand_id' => null, 'education_level_id' => 1, 'subject_id' => json_encode([1]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'code' => 'STU-HCCSR-02', 'firstname' => 'Juan', 'middlename' => 'B', 'lastname' => 'Dela Cruz', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Maria Dela Cruz']), 'email' => 's2_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 1, 'strand_id' => null, 'education_level_id' => 1, 'subject_id' => json_encode([1]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'code' => 'STU-HCCSR-03', 'firstname' => 'Maria', 'middlename' => 'C', 'lastname' => 'Clara', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Jose Clara']), 'email' => 's3_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 1, 'program_id' => 2, 'strand_id' => null, 'education_level_id' => 2, 'subject_id' => json_encode([2]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 4, 'code' => 'STU-HCCSR-04', 'firstname' => 'Jose', 'middlename' => 'D', 'lastname' => 'Rizal', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Teodora Rizal']), 'email' => 's4_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 2, 'program_id' => null, 'strand_id' => 1, 'education_level_id' => null, 'subject_id' => json_encode([3]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 5, 'code' => 'STU-HCCSR-05', 'firstname' => 'Andres', 'middlename' => 'E', 'lastname' => 'Bonifacio', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Catalina Bonifacio']), 'email' => 's5_sr@mail.com', 'password' => md5('password'), 'branch_id' => 2, 'department_id' => 2, 'program_id' => null, 'strand_id' => 2, 'education_level_id' => null, 'subject_id' => json_encode([4]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 6, 'code' => 'STU-CHCC-01', 'firstname' => 'Liza', 'middlename' => 'A', 'lastname' => 'Soberano', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'John Soberano']), 'email' => 's1_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 3, 'strand_id' => null, 'education_level_id' => 3, 'subject_id' => json_encode([5]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 7, 'code' => 'STU-CHCC-02', 'firstname' => 'Enrique', 'middlename' => 'B', 'lastname' => 'Gil', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Robert Gil']), 'email' => 's2_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 3, 'strand_id' => null, 'education_level_id' => 3, 'subject_id' => json_encode([5]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 8, 'code' => 'STU-CHCC-03', 'firstname' => 'Daniel', 'middlename' => 'C', 'lastname' => 'Padilla', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Carlos Padilla']), 'email' => 's3_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 3, 'program_id' => 4, 'strand_id' => null, 'education_level_id' => 4, 'subject_id' => json_encode([6]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 9, 'code' => 'STU-CHCC-04', 'firstname' => 'Kathryn', 'middlename' => 'D', 'lastname' => 'Bernardo', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Min Bernardo']), 'email' => 's4_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 4, 'program_id' => null, 'strand_id' => 3, 'education_level_id' => null, 'subject_id' => json_encode([7]), 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 10, 'code' => 'STU-CHCC-05', 'firstname' => 'Nadine', 'middlename' => 'E', 'lastname' => 'Lustre', 'personal_info' => json_encode(['year' => '1', 'guardian' => 'Ulysses Lustre']), 'email' => 's5_chcc@mail.com', 'password' => md5('password'), 'branch_id' => 3, 'department_id' => 4, 'program_id' => null, 'strand_id' => 4, 'education_level_id' => null, 'subject_id' => json_encode([8]), 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('question_class')->insert([
            ['id' => 1, 'branch_id' => 1, 'code' => 'QC-01', 'name' => 'Teacher Evaluation', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'branch_id' => 1, 'code' => 'QC-02', 'name' => 'Employee Evaluation', 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('question_type')->insert([
            ['id' => 1, 'branch_id' => 1, 'code' => 'QT-01', 'name' => 'Scale', 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'branch_id' => 1, 'code' => 'QT-02', 'name' => 'Comment', 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('question_choices')->insert([
            ['id' => 1, 'branch_id' => 1, 'code' => 'QCH-05', 'quantity' => 5, 'verbal_interpretation' => json_encode(['1' => 'Poor', '2' => 'Fair', '3' => 'Good', '4' => 'Very Good', '5' => 'Excellent']), 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('question')->insert([
            ['id' => 1, 'branch_id' => 1, 'code' => 'Q-001', 'description' => 'The instructor discusses the lessons clearly.', 'question_type_id' => 1, 'is_required' => 1, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 2, 'branch_id' => 1, 'code' => 'Q-002', 'description' => 'The instructor comes to class prepared.', 'question_type_id' => 1, 'is_required' => 1, 'is_activated' => 1, 'is_deleted' => 0],
            ['id' => 3, 'branch_id' => 1, 'code' => 'Q-003', 'description' => 'Additional comments or suggestions.', 'question_type_id' => 2, 'is_required' => 0, 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('questionnaire_type')->insert([
            ['id' => 1, 'branch_id' => 1, 'code' => 'QTYPE-TEACHER', 'name' => 'Teacher Evaluation Form', 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('questionnaires')->insert([
            ['id' => 1, 'branch_id' => 2, 'code' => 'QUES-001', 'questionnaire_type_id' => 1, 'question_choices_id' => 1, 'items' => json_encode([1, 2]), 'comments' => json_encode([3]), 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('questionnaire_distribution')->insert([
            ['id' => 1, 'branch_id' => 2, 'code' => 'QD-001', 'questionnaire_id' => 1, 'academic_year_id' => 1, 'items' => json_encode([1, 2, 3]), 'is_activated' => 1, 'is_deleted' => 0],
        ]);

        DB::table('answer_questionnaires')->insert([
            ['id' => 1, 'branch_id' => 2, 'code' => 'A1000000', 'academic_year_id' => 1, 'questionnaire_id' => 1, 'teacher_id' => 1, 'subject_id' => 1, 'answers' => json_encode(['1' => 5, '2' => 4]), 'comments' => json_encode(['Very good teacher'])],
        ]);

        DB::table('ratings_subject')->insert([
            ['id' => 1, 'academic_year_id' => 1, 'subject_id' => 1, 'teacher_id' => 1, 'submission_count' => 1, 'item_ratings' => json_encode(['1' => 5, '2' => 4]), 'comments' => json_encode(['Very good teacher']), 'overall_ratings' => json_encode(['average' => 4.5])],
        ]);

        DB::table('ratings_peer')->insert([
            ['id' => 1, 'academic_year_id' => 1, 'teacher_id' => 1, 'submission_count' => 1, 'item_ratings' => json_encode(['professionalism' => 5]), 'comments' => json_encode(['Cooperative']), 'overall_ratings' => json_encode(['average' => 5])],
        ]);

        DB::table('ratings_head')->insert([
            ['id' => 1, 'academic_year_id' => 1, 'teacher_id' => 1, 'submission_count' => 1, 'item_ratings' => json_encode(['leadership' => 4]), 'comments' => json_encode(['Reliable']), 'overall_ratings' => json_encode(['average' => 4])],
        ]);

        DB::table('ratings_employee')->insert([
            ['id' => 1, 'academic_year_id' => 1, 'employee_id' => 1, 'submission_count' => 1, 'item_ratings' => json_encode(['service' => 5]), 'comments' => json_encode(['Helpful staff']), 'overall_ratings' => json_encode(['average' => 5])],
        ]);

        DB::table('ratings_branch')->insert([
            ['id' => 1, 'academic_year_id' => 1, 'branch_id' => 2, 'submission_count' => 1, 'item_ratings' => json_encode(['campus_service' => 5]), 'comments' => json_encode(['Clean campus']), 'overall_ratings' => json_encode(['average' => 5])],
        ]);

        DB::table('overall_ratings')->insert([
            [
                'id' => 1,
                'branch_id' => 2,
                'academic_year_id' => 1,
                'outstanding_teacher' => json_encode(['teacher_id' => 1, 'name' => 'Juan D. Dela Cruz']),
                'outstanding_chair' => json_encode(['department_id' => 1, 'name' => 'College Department - Santa Rosa']),
                'outstanding_program' => json_encode(['program_id' => 1, 'name' => 'Bachelor of Science in Information Technology']),
                'outstanding_strand' => json_encode(['strand_id' => 1, 'name' => 'Science, Technology, Engineering and Mathematics']),
                'is_activated' => 1,
                'is_deleted' => 0,
            ],
        ]);
    }
}
