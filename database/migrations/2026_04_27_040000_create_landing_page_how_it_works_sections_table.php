<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_how_it_works_sections', function (Blueprint $table) {
            $table->id();
            $table->string('badge_text', 120)->default('Process');
            $table->string('title_text', 255)->default('How It Works');
            $table->text('subtitle_text')->nullable();
            $table->timestamps();
        });

        DB::table('landing_page_how_it_works_sections')->insert([
            'badge_text' => 'Process',
            'title_text' => 'How It Works',
            'subtitle_text' => 'Simple evaluation process in four steps',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_how_it_works_sections');
    }
};

