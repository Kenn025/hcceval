<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('evaluation_submissions') || Schema::hasColumn('evaluation_submissions', 'subject_id')) {
            return;
        }

        Schema::table('evaluation_submissions', function (Blueprint $table) {
            $table->unsignedBigInteger('subject_id')->nullable()->after('questionnaire_id');
            $table->index('subject_id', 'es_subject_idx');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('evaluation_submissions') || ! Schema::hasColumn('evaluation_submissions', 'subject_id')) {
            return;
        }

        Schema::table('evaluation_submissions', function (Blueprint $table) {
            $table->dropIndex('es_subject_idx');
            $table->dropColumn('subject_id');
        });
    }
};
