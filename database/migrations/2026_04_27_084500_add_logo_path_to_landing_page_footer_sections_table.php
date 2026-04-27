<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('landing_page_footer_sections')) {
            return;
        }

        if (! Schema::hasColumn('landing_page_footer_sections', 'logo_path')) {
            Schema::table('landing_page_footer_sections', function (Blueprint $table) {
                $table->string('logo_path', 255)->nullable()->after('logo_icon');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('landing_page_footer_sections')) {
            return;
        }

        if (Schema::hasColumn('landing_page_footer_sections', 'logo_path')) {
            Schema::table('landing_page_footer_sections', function (Blueprint $table) {
                $table->dropColumn('logo_path');
            });
        }
    }
};
