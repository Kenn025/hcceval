<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Legacy tables from the original PHP evaluation system.
 * Kept intact for read access from ratings/questionnaire controllers.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Legacy admin/user tables
        Schema::create('branch', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->string('highest_department', 50)->nullable();
            $table->text('custom_settings')->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_main')->default(false);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('admin', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->string('role', 100);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('email', 150)->unique();
            $table->string('password', 255);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('branch_id');
            $table->index('role');
            $table->foreign('branch_id')->references('id')->on('branch')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('department', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('branch_id');
            $table->foreign('branch_id')->references('id')->on('branch')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('program', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->unsignedBigInteger('department_id')->nullable();
            $table->integer('duration_years');
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('department_id');
            $table->foreign('department_id')->references('id')->on('department')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('strand', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->unsignedBigInteger('department_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('department_id');
            $table->foreign('department_id')->references('id')->on('department')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('education_level', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('program_id')->nullable();
            $table->string('year_level', 50);
            $table->string('section', 50);
            $table->json('teacher_id')->nullable();
            $table->json('subject_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('department_id');
            $table->index('program_id');
            $table->foreign('department_id')->references('id')->on('department')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('program_id')->references('id')->on('program')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('teacher', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('firstname', 100);
            $table->string('middlename', 100)->nullable();
            $table->string('lastname', 100);
            $table->string('role', 100)->nullable();
            $table->json('personal_info')->nullable();
            $table->string('email', 150)->unique();
            $table->string('password', 255);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('program_id')->nullable();
            $table->unsignedBigInteger('strand_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('branch_id');
            $table->index('department_id');
            $table->index('program_id');
            $table->index('strand_id');
            $table->foreign('branch_id')->references('id')->on('branch')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('department_id')->references('id')->on('department')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('program_id')->references('id')->on('program')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('strand_id')->references('id')->on('strand')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('employee', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('firstname', 100);
            $table->string('middlename', 100)->nullable();
            $table->string('lastname', 100);
            $table->string('role', 100)->nullable();
            $table->json('personal_info')->nullable();
            $table->string('email', 150)->unique();
            $table->string('password', 255);
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('program_id')->nullable();
            $table->unsignedBigInteger('strand_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('branch_id');
            $table->index('department_id');
            $table->index('program_id');
            $table->index('strand_id');
            $table->foreign('department_id')->references('id')->on('department')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('program_id')->references('id')->on('program')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('strand_id')->references('id')->on('strand')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('branch_id')->references('id')->on('branch')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('student', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('firstname', 100);
            $table->string('middlename', 100)->nullable();
            $table->string('lastname', 100);
            $table->json('personal_info')->nullable();
            $table->string('email', 150)->unique();
            $table->string('password', 255);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('program_id')->nullable();
            $table->unsignedBigInteger('strand_id')->nullable();
            $table->unsignedBigInteger('education_level_id')->nullable();
            $table->json('subject_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('branch_id');
            $table->index('department_id');
            $table->index('program_id');
            $table->index('strand_id');
            $table->index('education_level_id');
            $table->foreign('branch_id')->references('id')->on('branch')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('department_id')->references('id')->on('department')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('program_id')->references('id')->on('program')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('strand_id')->references('id')->on('strand')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('education_level_id')->references('id')->on('education_level')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('subject', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->string('type', 100);
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('program_id')->nullable();
            $table->unsignedBigInteger('strand_id')->nullable();
            $table->json('teacher_id')->nullable();
            $table->boolean('is_gened')->default(false);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('department_id');
            $table->index('program_id');
            $table->index('strand_id');
            $table->foreign('department_id')->references('id')->on('department')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('program_id')->references('id')->on('program')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('strand_id')->references('id')->on('strand')->nullOnDelete()->cascadeOnUpdate();
        });

        // Evaluation cycle
        Schema::create('academic_year', function (Blueprint $table) {
            $table->id();
            $table->year('from_year');
            $table->year('to_year');
            $table->string('term', 50);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        // Questionnaire system
        Schema::create('question_type', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('question_class', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('question_choices', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->integer('quantity');
            $table->json('verbal_interpretation')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('question', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->text('description');
            $table->unsignedBigInteger('question_type_id')->nullable();
            $table->boolean('is_required')->default(true);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('question_type_id');
            $table->foreign('question_type_id')->references('id')->on('question_type')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('questionnaire_type', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('questionnaires', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->unsignedBigInteger('questionnaire_type_id')->nullable();
            $table->unsignedBigInteger('question_choices_id')->nullable();
            $table->json('items')->nullable();
            $table->json('comments')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('questionnaire_type_id');
            $table->index('question_choices_id');
            $table->foreign('questionnaire_type_id')->references('id')->on('questionnaire_type')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('question_choices_id')->references('id')->on('question_choices')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('questionnaire_distribution', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->unsignedBigInteger('questionnaire_id')->nullable();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->json('items')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('questionnaire_id');
            $table->index('academic_year_id');
            $table->foreign('questionnaire_id')->references('id')->on('questionnaires')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('academic_year_id')->references('id')->on('academic_year')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('answer_questionnaires', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('questionnaire_id')->nullable();
            $table->unsignedBigInteger('teacher_id')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('answers')->nullable();
            $table->json('comments')->nullable();
            $table->timestamps();
            $table->index('academic_year_id');
            $table->index('questionnaire_id');
            $table->index('teacher_id');
            $table->index('subject_id');
            $table->foreign('academic_year_id')->references('id')->on('academic_year')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('questionnaire_id')->references('id')->on('questionnaires')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('teacher_id')->references('id')->on('teacher')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('subject_id')->references('id')->on('subject')->nullOnDelete()->cascadeOnUpdate();
        });

        // Ratings tables
        Schema::create('ratings_subject', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->unsignedBigInteger('teacher_id')->nullable();
            $table->integer('submission_count')->default(0);
            $table->json('item_ratings')->nullable();
            $table->json('comments')->nullable();
            $table->json('overall_ratings')->nullable();
            $table->timestamps();
            $table->index('academic_year_id');
            $table->index('subject_id');
            $table->index('teacher_id');
            $table->foreign('academic_year_id')->references('id')->on('academic_year')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('subject_id')->references('id')->on('subject')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('teacher_id')->references('id')->on('teacher')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('ratings_peer', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('teacher_id')->nullable();
            $table->integer('submission_count')->default(0);
            $table->json('item_ratings')->nullable();
            $table->json('comments')->nullable();
            $table->json('overall_ratings')->nullable();
            $table->timestamps();
            $table->index('academic_year_id');
            $table->index('teacher_id');
            $table->foreign('academic_year_id')->references('id')->on('academic_year')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('teacher_id')->references('id')->on('teacher')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('ratings_employee', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->integer('submission_count')->default(0);
            $table->json('item_ratings')->nullable();
            $table->json('comments')->nullable();
            $table->json('overall_ratings')->nullable();
            $table->timestamps();
            $table->index('academic_year_id');
            $table->index('employee_id');
            $table->foreign('academic_year_id')->references('id')->on('academic_year')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('employee_id')->references('id')->on('employee')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('ratings_head', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('teacher_id')->nullable();
            $table->integer('submission_count')->default(0);
            $table->json('item_ratings')->nullable();
            $table->json('comments')->nullable();
            $table->json('overall_ratings')->nullable();
            $table->timestamps();
            $table->index('academic_year_id');
            $table->index('teacher_id');
            $table->foreign('academic_year_id')->references('id')->on('academic_year')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('teacher_id')->references('id')->on('teacher')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('ratings_branch', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->integer('submission_count')->default(0);
            $table->json('item_ratings')->nullable();
            $table->json('comments')->nullable();
            $table->json('overall_ratings')->nullable();
            $table->timestamps();
            $table->index('academic_year_id');
            $table->index('branch_id');
            $table->foreign('academic_year_id')->references('id')->on('academic_year')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('branch_id')->references('id')->on('branch')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('overall_ratings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->json('outstanding_teacher')->nullable();
            $table->json('outstanding_chair')->nullable();
            $table->json('outstanding_program')->nullable();
            $table->json('outstanding_strand')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('branch_id');
            $table->index('academic_year_id');
            $table->foreign('branch_id')->references('id')->on('branch')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('academic_year_id')->references('id')->on('academic_year')->nullOnDelete()->cascadeOnUpdate();
        });

        DB::table('branch')->insert([
            [
                'id' => 1,
                'code' => 'OVERALL',
                'name' => 'Overall Branch',
                'highest_department' => null,
                'custom_settings' => null,
                'address' => 'System Wide',
                'is_main' => true,
                'is_activated' => true,
                'is_deleted' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 2,
                'code' => 'HCC-SR',
                'name' => 'Holy Cross College Santa Rosa Nueva Ecija',
                'highest_department' => null,
                'custom_settings' => null,
                'address' => 'Santa Rosa, Nueva Ecija',
                'is_main' => false,
                'is_activated' => true,
                'is_deleted' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 3,
                'code' => 'CHCC',
                'name' => 'Concepcion Holy Cross College',
                'highest_department' => null,
                'custom_settings' => null,
                'address' => 'Concepcion, Tarlac',
                'is_main' => false,
                'is_activated' => true,
                'is_deleted' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('overall_ratings');
        Schema::dropIfExists('ratings_branch');
        Schema::dropIfExists('ratings_head');
        Schema::dropIfExists('ratings_employee');
        Schema::dropIfExists('ratings_peer');
        Schema::dropIfExists('ratings_subject');
        Schema::dropIfExists('answer_questionnaires');
        Schema::dropIfExists('questionnaire_distribution');
        Schema::dropIfExists('questionnaires');
        Schema::dropIfExists('questionnaire_type');
        Schema::dropIfExists('question');
        Schema::dropIfExists('question_choices');
        Schema::dropIfExists('question_class');
        Schema::dropIfExists('question_type');
        Schema::dropIfExists('academic_year');
        Schema::dropIfExists('subject');
        Schema::dropIfExists('student');
        Schema::dropIfExists('employee');
        Schema::dropIfExists('teacher');
        Schema::dropIfExists('education_level');
        Schema::dropIfExists('strand');
        Schema::dropIfExists('program');
        Schema::dropIfExists('department');
        Schema::dropIfExists('branch');
        Schema::dropIfExists('admin');
        Schema::enableForeignKeyConstraints();
    }
};
