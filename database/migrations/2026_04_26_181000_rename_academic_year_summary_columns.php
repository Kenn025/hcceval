<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('academic_year', function (Blueprint $table) {
            if (Schema::hasColumn('academic_year', 'total_questions') && ! Schema::hasColumn('academic_year', 'total_assigned_questions')) {
                $table->renameColumn('total_questions', 'total_assigned_questions');
            }

            if (Schema::hasColumn('academic_year', 'total_submissions') && ! Schema::hasColumn('academic_year', 'total_evaluation_submitted')) {
                $table->renameColumn('total_submissions', 'total_evaluation_submitted');
            }

            if (Schema::hasColumn('academic_year', 'question_submissions')) {
                $table->dropColumn('question_submissions');
            }
        });
    }

    public function down(): void
    {
        Schema::table('academic_year', function (Blueprint $table) {
            if (Schema::hasColumn('academic_year', 'total_assigned_questions') && ! Schema::hasColumn('academic_year', 'total_questions')) {
                $table->renameColumn('total_assigned_questions', 'total_questions');
            }

            if (! Schema::hasColumn('academic_year', 'question_submissions')) {
                $table->unsignedInteger('question_submissions')->default(0)->after('total_questions');
            }

            if (Schema::hasColumn('academic_year', 'total_evaluation_submitted') && ! Schema::hasColumn('academic_year', 'total_submissions')) {
                $table->renameColumn('total_evaluation_submitted', 'total_submissions');
            }
        });
    }
};
