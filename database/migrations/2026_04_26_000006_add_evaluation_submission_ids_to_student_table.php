<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('student') || Schema::hasColumn('student', 'evaluation_submission_ids')) {
            return;
        }

        Schema::table('student', function (Blueprint $table) {
            $table->json('evaluation_submission_ids')->nullable()->after('irreg_subject_map');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('student') || ! Schema::hasColumn('student', 'evaluation_submission_ids')) {
            return;
        }

        Schema::table('student', function (Blueprint $table) {
            $table->dropColumn('evaluation_submission_ids');
        });
    }
};
