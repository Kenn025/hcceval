<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('landing_page_features') && Schema::hasColumn('landing_page_features', 'icon')) {
            Schema::table('landing_page_features', function (Blueprint $table) {
                $table->dropColumn('icon');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('landing_page_features') && ! Schema::hasColumn('landing_page_features', 'icon')) {
            Schema::table('landing_page_features', function (Blueprint $table) {
                $table->string('icon', 60)->default('dashboard')->after('id');
            });
        }
    }
};

