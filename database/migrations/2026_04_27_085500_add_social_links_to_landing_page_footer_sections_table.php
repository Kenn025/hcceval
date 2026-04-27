<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('landing_page_footer_sections')) {
            return;
        }

        Schema::table('landing_page_footer_sections', function (Blueprint $table) {
            if (! Schema::hasColumn('landing_page_footer_sections', 'social_1_link')) {
                $table->string('social_1_link', 255)->nullable()->after('social_1_label');
            }
            if (! Schema::hasColumn('landing_page_footer_sections', 'social_2_link')) {
                $table->string('social_2_link', 255)->nullable()->after('social_2_label');
            }
            if (! Schema::hasColumn('landing_page_footer_sections', 'social_3_link')) {
                $table->string('social_3_link', 255)->nullable()->after('social_3_label');
            }
        });

        DB::table('landing_page_footer_sections')
            ->whereNull('social_1_link')
            ->update(['social_1_link' => 'https://facebook.com']);
        DB::table('landing_page_footer_sections')
            ->whereNull('social_2_link')
            ->update(['social_2_link' => 'https://instagram.com']);
        DB::table('landing_page_footer_sections')
            ->whereNull('social_3_link')
            ->update(['social_3_link' => 'https://linkedin.com']);
    }

    public function down(): void
    {
        if (! Schema::hasTable('landing_page_footer_sections')) {
            return;
        }

        Schema::table('landing_page_footer_sections', function (Blueprint $table) {
            if (Schema::hasColumn('landing_page_footer_sections', 'social_1_link')) {
                $table->dropColumn('social_1_link');
            }
            if (Schema::hasColumn('landing_page_footer_sections', 'social_2_link')) {
                $table->dropColumn('social_2_link');
            }
            if (Schema::hasColumn('landing_page_footer_sections', 'social_3_link')) {
                $table->dropColumn('social_3_link');
            }
        });
    }
};
