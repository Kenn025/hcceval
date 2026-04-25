<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return;
        }

        foreach (['es_evaluator_idx', 'es_evaluatee_period_idx', 'es_category_idx'] as $index) {
            try {
                Schema::table('evaluation_submissions', function (Blueprint $table) use ($index) {
                    $table->dropIndex($index);
                });
            } catch (\Throwable) {
                // Already absent on databases that never had the legacy indexes.
            }
        }

        $columns = array_values(array_filter([
            'evaluator_type',
            'evaluatee_id',
            'evaluatee_type',
            'category',
            'subject_section_id',
        ], fn (string $column) => Schema::hasColumn('evaluation_submissions', $column)));

        if ($columns !== []) {
            Schema::table('evaluation_submissions', function (Blueprint $table) use ($columns) {
                $table->dropColumn($columns);
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return;
        }

        Schema::table('evaluation_submissions', function (Blueprint $table) {
            if (! Schema::hasColumn('evaluation_submissions', 'evaluator_type')) {
                $table->string('evaluator_type', 32)->nullable()->after('evaluator_id');
            }

            if (! Schema::hasColumn('evaluation_submissions', 'evaluatee_id')) {
                $table->unsignedBigInteger('evaluatee_id')->nullable()->after('evaluator_type');
            }

            if (! Schema::hasColumn('evaluation_submissions', 'evaluatee_type')) {
                $table->string('evaluatee_type', 32)->nullable()->after('evaluatee_id');
            }

            if (! Schema::hasColumn('evaluation_submissions', 'category')) {
                $table->string('category', 64)->nullable()->after('evaluatee_type');
            }

            if (! Schema::hasColumn('evaluation_submissions', 'subject_section_id')) {
                $table->unsignedBigInteger('subject_section_id')->nullable()->after('category');
            }
        });
    }
};
