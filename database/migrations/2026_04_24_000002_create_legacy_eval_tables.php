<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
        Schema::create('admin', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->string('role', 100);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('email', 150);
            $table->string('password');
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('branch', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->string('highest_department', 50)->nullable();
            $table->text('custom_settings')->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_main')->default(false);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('department', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('program', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->unsignedBigInteger('department_id')->nullable();
            $table->integer('duration_years')->default(4);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('strand', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->unsignedBigInteger('department_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('education_level', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('program_id')->nullable();
            $table->string('year_level', 50);
            $table->string('section', 50);
            $table->longText('teacher_id')->nullable();
            $table->longText('subject_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('teacher', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('firstname', 100);
            $table->string('middlename', 100)->nullable();
            $table->string('lastname', 100);
            $table->string('role', 100)->nullable();
            $table->longText('personal_info')->nullable();
            $table->string('email', 150);
            $table->string('password');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('program_id')->nullable();
            $table->unsignedBigInteger('strand_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('employee', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('firstname', 100);
            $table->string('middlename', 100)->nullable();
            $table->string('lastname', 100);
            $table->string('role', 100)->nullable();
            $table->longText('personal_info')->nullable();
            $table->string('email', 150);
            $table->string('password');
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('program_id')->nullable();
            $table->unsignedBigInteger('strand_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('student', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('firstname', 100);
            $table->string('middlename', 100)->nullable();
            $table->string('lastname', 100);
            $table->longText('personal_info')->nullable();
            $table->string('email', 150);
            $table->string('password');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('program_id')->nullable();
            $table->unsignedBigInteger('strand_id')->nullable();
            $table->unsignedBigInteger('education_level_id')->nullable();
            $table->longText('subject_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('subject', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->string('type', 100);
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('program_id')->nullable();
            $table->unsignedBigInteger('strand_id')->nullable();
            $table->longText('teacher_id')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        // Evaluation cycle
        Schema::create('academic_year', function (Blueprint $table) {
            $table->id();
            $table->year('from_year');
            $table->year('to_year');
            $table->string('term', 50);
            $table->boolean('is_activated')->default(false);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        // Questionnaire system
        Schema::create('question_type', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('question_class', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('question_choices', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->integer('quantity');
            $table->longText('verbal_interpretation')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('question', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->text('description');
            $table->unsignedBigInteger('question_type_id')->nullable();
            $table->boolean('is_required')->default(true);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('questionnaire_type', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('questionnaires', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->unsignedBigInteger('questionnaire_type_id')->nullable();
            $table->unsignedBigInteger('question_choices_id')->nullable();
            $table->longText('items')->nullable();
            $table->longText('comments')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        Schema::create('questionnaire_distribution', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->unsignedBigInteger('questionnaire_id')->nullable();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->longText('items')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->index('questionnaire_id');
            $table->index('academic_year_id');
        });

        Schema::create('answer_questionnaires', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('questionnaire_id')->nullable();
            $table->unsignedBigInteger('teacher_id')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->longText('answers')->nullable();
            $table->longText('comments')->nullable();
            $table->timestamps();
        });

        // Ratings tables
        Schema::create('ratings_subject', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->unsignedBigInteger('teacher_id')->nullable();
            $table->integer('submission_count')->default(0);
            $table->longText('item_ratings')->nullable();
            $table->longText('comments')->nullable();
            $table->longText('overall_ratings')->nullable();
            $table->timestamps();
        });

        Schema::create('ratings_peer', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('teacher_id')->nullable();
            $table->integer('submission_count')->default(0);
            $table->longText('item_ratings')->nullable();
            $table->longText('comments')->nullable();
            $table->longText('overall_ratings')->nullable();
            $table->timestamps();
        });

        Schema::create('ratings_employee', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->integer('submission_count')->default(0);
            $table->longText('item_ratings')->nullable();
            $table->longText('comments')->nullable();
            $table->longText('overall_ratings')->nullable();
            $table->timestamps();
        });

        Schema::create('ratings_head', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('teacher_id')->nullable();
            $table->integer('submission_count')->default(0);
            $table->longText('item_ratings')->nullable();
            $table->longText('comments')->nullable();
            $table->longText('overall_ratings')->nullable();
            $table->timestamps();
        });

        Schema::create('ratings_branch', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->integer('submission_count')->default(0);
            $table->longText('item_ratings')->nullable();
            $table->longText('comments')->nullable();
            $table->longText('overall_ratings')->nullable();
            $table->timestamps();
        });

        Schema::create('overall_ratings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->longText('outstanding_teacher')->nullable();
            $table->longText('outstanding_chair')->nullable();
            $table->longText('outstanding_program')->nullable();
            $table->longText('outstanding_strand')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
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
    }
};
