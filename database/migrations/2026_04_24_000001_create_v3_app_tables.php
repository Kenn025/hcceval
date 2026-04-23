<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('education_levels', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->string('highest_department', 50)->nullable();
            $table->text('custom_settings')->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_main')->default(false);
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('education_level_id');
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();
            $table->index('branch_id');
            $table->index('education_level_id');
        });

        // employees before programs/strands because programs reference employee IDs
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_no', 50)->unique();
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('program_id')->nullable();
            $table->unsignedBigInteger('strand_id')->nullable();
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('suffix_name', 50)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('password');
            $table->string('role', 100)->default('FACULTY');
            $table->boolean('is_active')->default(true);
            $table->dateTime('last_login')->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index('branch_id');
            $table->index('department_id');
        });

        Schema::create('programs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('department_id');
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('program_type', 50)->default('PROGRAM');
            $table->integer('duration_years')->nullable();
            $table->unsignedBigInteger('chair_employee_id')->nullable();
            $table->decimal('total_units', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();
            $table->index('department_id');
            $table->index('chair_employee_id');
        });

        Schema::create('strands', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('department_id');
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->integer('duration_years')->nullable();
            $table->unsignedBigInteger('adviser_employee_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();
            $table->index('department_id');
        });

        Schema::create('year_levels', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('department_id');
            $table->unsignedBigInteger('education_level_id');
            $table->unsignedBigInteger('program_id')->nullable();
            $table->unsignedBigInteger('strand_id')->nullable();
            $table->string('code', 100)->unique();
            $table->string('name', 150);
            $table->integer('level_no');
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();
            $table->index('department_id');
            $table->index('education_level_id');
        });

        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('year_level_id');
            $table->string('code', 50);
            $table->string('name', 150);
            $table->unsignedBigInteger('adviser_employee_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();
            $table->index('year_level_id');
        });

        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('year_level_id')->nullable();
            $table->unsignedBigInteger('department_id');
            $table->string('term_type', 50)->nullable();
            $table->string('term', 50)->nullable();
            $table->string('education_level', 100)->nullable();
            $table->string('grade_level', 100)->nullable();
            $table->string('academic_track', 150)->nullable();
            $table->string('academic_strand', 150)->nullable();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->decimal('units', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();
            $table->index('department_id');
            $table->index('year_level_id');
        });

        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('student_no', 50)->unique();
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('department_id');
            $table->unsignedBigInteger('program_id')->nullable();
            $table->unsignedBigInteger('strand_id')->nullable();
            $table->unsignedBigInteger('year_level_id')->nullable();
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('suffix_name', 50)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('password');
            $table->string('status', 50)->default('active');
            $table->boolean('is_active')->default(true);
            $table->dateTime('last_login')->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index('branch_id');
            $table->index('department_id');
        });

        Schema::create('subject_sections', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('section_id');
            $table->unsignedBigInteger('subject_id');
            $table->unsignedBigInteger('teacher_employee_id')->nullable();
            $table->string('school_year', 20);
            $table->string('term', 50);
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();
            $table->index('section_id');
            $table->index('subject_id');
        });

        Schema::create('year_level_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('year_level_id');
            $table->unsignedBigInteger('subject_id');
            $table->integer('semester_no')->nullable();
            $table->boolean('is_required')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index('year_level_id');
            $table->index('subject_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('year_level_subjects');
        Schema::dropIfExists('subject_sections');
        Schema::dropIfExists('students');
        Schema::dropIfExists('subjects');
        Schema::dropIfExists('sections');
        Schema::dropIfExists('year_levels');
        Schema::dropIfExists('strands');
        Schema::dropIfExists('programs');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('departments');
        Schema::dropIfExists('branches');
        Schema::dropIfExists('education_levels');
    }
};
