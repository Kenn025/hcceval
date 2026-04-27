<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('landing_page_footer_sections')) {
            return;
        }

        DB::table('landing_page_footer_sections')
            ->whereRaw('LOWER(TRIM(social_1_label)) = ?', ['md'])
            ->update(['social_1_label' => 'facebook']);

        DB::table('landing_page_footer_sections')
            ->whereRaw('LOWER(TRIM(social_2_label)) = ?', ['td'])
            ->update(['social_2_label' => 'instagram']);

        DB::table('landing_page_footer_sections')
            ->whereRaw('LOWER(TRIM(social_3_label)) = ?', ['gd'])
            ->update(['social_3_label' => 'linkedin']);
    }

    public function down(): void
    {
        // No-op: keep canonical labels.
    }
};
