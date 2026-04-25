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

        if (Schema::hasColumn('evaluation_submissions', 'evaluator_id')) {
            Schema::table('evaluation_submissions', function (Blueprint $table) {
                $table->dropColumn('evaluator_id');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return;
        }

        if (! Schema::hasColumn('evaluation_submissions', 'evaluator_id')) {
            Schema::table('evaluation_submissions', function (Blueprint $table) {
                $table->unsignedBigInteger('evaluator_id')->nullable()->after('id');
            });
        }

    }
};
