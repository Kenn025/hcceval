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
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('questionnaire_type_id')->nullable();
            $table->unsignedBigInteger('questionnaire_id')->nullable();
            $table->unsignedBigInteger('teacher_id')->nullable();
            $table->json('answers');
            $table->json('comments')->nullable();
            $table->timestamps();

            $table->index('branch_id', 'es_branch_idx');
            $table->index('academic_year_id', 'es_academic_year_idx');
            $table->index('questionnaire_type_id', 'es_questionnaire_type_idx');
            $table->index('questionnaire_id', 'es_questionnaire_idx');
            $table->index('teacher_id', 'es_teacher_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_submissions');
    }
};
