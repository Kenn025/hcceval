<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subject_sections', function (Blueprint $table) {
            $table->string('schedule', 150)->nullable()->after('term');
            $table->string('room', 100)->nullable()->after('schedule');
        });

        Schema::create('student_enrollments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('subject_section_id');
            $table->enum('status', ['enrolled', 'dropped'])->default('enrolled');
            $table->dateTime('enrolled_at')->nullable();
            $table->timestamps();
            $table->index('student_id');
            $table->index('subject_section_id');
            $table->unique(['student_id', 'subject_section_id']);
        });

        Schema::create('evaluation_submissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('evaluator_id')->nullable();
            $table->enum('evaluator_type', ['student', 'teacher'])->default('student');
            $table->enum('category', ['teacher_subject', 'teacher_outside', 'program_chair', 'employee']);
            $table->unsignedBigInteger('evaluatee_id')->nullable();
            $table->unsignedBigInteger('subject_section_id')->nullable();
            $table->unsignedBigInteger('academic_year_id');
            $table->string('school_year', 20);
            $table->string('term', 50);
            $table->longText('answers')->nullable();
            $table->text('comments')->nullable();
            $table->dateTime('submitted_at')->useCurrent();
            $table->timestamps();
            $table->index('evaluator_id');
            $table->index('evaluatee_id');
            $table->index('academic_year_id');
            $table->unique(
                ['evaluator_id', 'evaluator_type', 'category', 'evaluatee_id', 'subject_section_id', 'school_year', 'term'],
                'eval_submissions_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_submissions');
        Schema::dropIfExists('student_enrollments');

        Schema::table('subject_sections', function (Blueprint $table) {
            $table->dropColumn(['schedule', 'room']);
        });
    }
};
