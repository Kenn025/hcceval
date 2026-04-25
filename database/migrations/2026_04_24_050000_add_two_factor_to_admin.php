<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('admin') && ! Schema::hasColumn('admin', 'two_factor_enabled')) {
            Schema::table('admin', function (Blueprint $table) {
                $table->boolean('two_factor_enabled')->default(false)->after('is_deleted');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('admin') && Schema::hasColumn('admin', 'two_factor_enabled')) {
            Schema::table('admin', function (Blueprint $table) {
                $table->dropColumn('two_factor_enabled');
            });
        }
    }
};
