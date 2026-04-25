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

        foreach (['es_student_idx', 'es_teacher_idx'] as $index) {
            try {
                Schema::table('evaluation_submissions', function (Blueprint $table) use ($index) {
                    $table->dropIndex($index);
                });
            } catch (\Throwable) {
                // Already absent.
            }
        }

        $columns = array_values(array_filter([
            'student_id',
            'teacher_id',
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
            if (! Schema::hasColumn('evaluation_submissions', 'student_id')) {
                $table->unsignedBigInteger('student_id')->nullable()->after('id');
            }

            if (! Schema::hasColumn('evaluation_submissions', 'teacher_id')) {
                $table->unsignedBigInteger('teacher_id')->nullable()->after('subject_id');
            }
        });
    }
};
