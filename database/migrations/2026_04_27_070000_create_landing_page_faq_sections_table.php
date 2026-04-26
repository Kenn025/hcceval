<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_faq_sections', function (Blueprint $table) {
            $table->id();
            $table->string('badge_text', 120)->default('FAQ');
            $table->string('title_text', 255)->default('Frequently Asked Questions');
            $table->timestamps();
        });

        DB::table('landing_page_faq_sections')->insert([
            'badge_text' => 'FAQ',
            'title_text' => 'Frequently Asked Questions',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_faq_sections');
    }
};
