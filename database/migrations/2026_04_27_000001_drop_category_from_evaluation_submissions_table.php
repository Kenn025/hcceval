<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('evaluation_submissions') || ! Schema::hasColumn('evaluation_submissions', 'category')) {
            return;
        }

        Schema::table('evaluation_submissions', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('evaluation_submissions') || Schema::hasColumn('evaluation_submissions', 'category')) {
            return;
        }

        Schema::table('evaluation_submissions', function (Blueprint $table) {
            $table->string('category', 64)->nullable()->after('employee_id');
            $table->index('category', 'es_category_idx');
        });
    }
};
