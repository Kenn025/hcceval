<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return;
        }

        Schema::table('evaluation_submissions', function (Blueprint $table) {
            if (! Schema::hasColumn('evaluation_submissions', 'branch_id')) {
                $table->unsignedBigInteger('branch_id')->nullable()->after('id')->index('es_branch_idx');
            }

            if (! Schema::hasColumn('evaluation_submissions', 'academic_year_id')) {
                $table->unsignedBigInteger('academic_year_id')->nullable()->after('branch_id')->index('es_academic_year_idx');
            }

            if (! Schema::hasColumn('evaluation_submissions', 'questionnaire_type_id')) {
                $table->unsignedBigInteger('questionnaire_type_id')->nullable()->after('academic_year_id')->index('es_questionnaire_type_idx');
            }

            if (! Schema::hasColumn('evaluation_submissions', 'questionnaire_id')) {
                $table->unsignedBigInteger('questionnaire_id')->nullable()->after('questionnaire_type_id')->index('es_questionnaire_idx');
            }

            if (! Schema::hasColumn('evaluation_submissions', 'subject_id')) {
                $table->unsignedBigInteger('subject_id')->nullable()->after('questionnaire_id')->index('es_subject_idx');
            }

        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("UPDATE evaluation_submissions SET comments = JSON_OBJECT('text', comments) WHERE comments IS NOT NULL AND JSON_VALID(comments) = 0");
            DB::statement('ALTER TABLE evaluation_submissions MODIFY comments JSON NULL');
        }

        $this->dropLegacyColumns();
    }

    private function dropLegacyColumns(): void
    {
        $legacyIndexes = [
            'es_evaluator_idx',
            'es_evaluatee_period_idx',
            'es_period_idx',
            'es_category_idx',
        ];

        foreach ($legacyIndexes as $index) {
            try {
                Schema::table('evaluation_submissions', function (Blueprint $table) use ($index) {
                    $table->dropIndex($index);
                });
            } catch (\Throwable) {
                // Index may not exist depending on migration state/database driver.
            }
        }

        $legacyColumns = [
            'evaluator_id',
            'evaluator_type',
            'evaluatee_id',
            'evaluatee_type',
            'category',
            'subject_section_id',
            'school_year',
            'term',
            'overall_average',
            'submitted_at',
        ];

        $columnsToDrop = array_values(array_filter(
            $legacyColumns,
            fn (string $column) => Schema::hasColumn('evaluation_submissions', $column),
        ));

        if ($columnsToDrop !== []) {
            Schema::table('evaluation_submissions', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE evaluation_submissions MODIFY comments TEXT NULL');
        }

        Schema::table('evaluation_submissions', function (Blueprint $table) {
            foreach (['subject_id', 'questionnaire_id', 'questionnaire_type_id', 'branch_id'] as $column) {
                if (Schema::hasColumn('evaluation_submissions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
