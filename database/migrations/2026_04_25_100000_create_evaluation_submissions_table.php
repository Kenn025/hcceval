<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_submissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('evaluator_id');
            $table->string('evaluator_type', 32); // student / teacher / employee
            $table->unsignedBigInteger('evaluatee_id')->nullable();
            $table->string('evaluatee_type', 32)->nullable(); // teacher / employee
            $table->string('category', 64); // teacher_subject / peer_employee / head / ...
            $table->unsignedBigInteger('subject_section_id')->nullable();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->string('school_year', 20);
            $table->string('term', 50);
            $table->json('answers');
            $table->text('comments')->nullable();
            $table->decimal('overall_average', 5, 2)->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->index(['evaluator_id', 'evaluator_type'], 'es_evaluator_idx');
            $table->index(['evaluatee_id', 'school_year', 'term'], 'es_evaluatee_period_idx');
            $table->index(['school_year', 'term'], 'es_period_idx');
            $table->index('category', 'es_category_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_submissions');
    }
};

