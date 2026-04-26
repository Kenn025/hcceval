<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('landing_page_headers', function (Blueprint $table) {
            $table->dropColumn(['target_type', 'open_in_new_tab']);
        });
    }

    public function down(): void
    {
        Schema::table('landing_page_headers', function (Blueprint $table) {
            $table->enum('target_type', ['section', 'url'])->default('section')->after('target');
            $table->boolean('open_in_new_tab')->default(false)->after('is_active');
        });
    }
};
