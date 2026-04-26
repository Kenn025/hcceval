<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('evaluation_submissions') || Schema::hasColumn('evaluation_submissions', 'teacher_id')) {
            return;
        }

        Schema::table('evaluation_submissions', function (Blueprint $table) {
            $table->unsignedBigInteger('teacher_id')->nullable()->after('subject_id');
            $table->index('teacher_id', 'es_teacher_idx');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('evaluation_submissions') || ! Schema::hasColumn('evaluation_submissions', 'teacher_id')) {
            return;
        }

        Schema::table('evaluation_submissions', function (Blueprint $table) {
            $table->dropIndex('es_teacher_idx');
            $table->dropColumn('teacher_id');
        });
    }
};
