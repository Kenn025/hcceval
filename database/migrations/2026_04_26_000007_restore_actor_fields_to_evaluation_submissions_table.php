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

        Schema::table('evaluation_submissions', function (Blueprint $table) {
            if (! Schema::hasColumn('evaluation_submissions', 'school_year')) {
                $table->string('school_year', 20)->nullable()->after('academic_year_id');
            }

            if (! Schema::hasColumn('evaluation_submissions', 'term')) {
                $table->string('term', 50)->nullable()->after('school_year');
            }

            if (! Schema::hasColumn('evaluation_submissions', 'overall_average')) {
                $table->decimal('overall_average', 5, 2)->nullable()->after('comments');
            }

            if (! Schema::hasColumn('evaluation_submissions', 'submitted_at')) {
                $table->timestamp('submitted_at')->nullable()->after('overall_average');
            }
        });

        foreach ([
            'es_period_idx' => ['school_year', 'term'],
        ] as $index => $columns) {
            try {
                Schema::table('evaluation_submissions', function (Blueprint $table) use ($columns, $index) {
                    $table->index($columns, $index);
                });
            } catch (\Throwable) {
                // The index may already exist on databases migrated from an older schema.
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return;
        }

        foreach (['es_period_idx'] as $index) {
            try {
                Schema::table('evaluation_submissions', function (Blueprint $table) use ($index) {
                    $table->dropIndex($index);
                });
            } catch (\Throwable) {
                // Already absent.
            }
        }

        $columns = array_values(array_filter([
            'school_year',
            'term',
            'overall_average',
            'submitted_at',
        ], fn (string $column) => Schema::hasColumn('evaluation_submissions', $column)));

        if ($columns !== []) {
            Schema::table('evaluation_submissions', function (Blueprint $table) use ($columns) {
                $table->dropColumn($columns);
            });
        }
    }
};
