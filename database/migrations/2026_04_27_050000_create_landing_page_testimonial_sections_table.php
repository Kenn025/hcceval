<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_testimonial_sections', function (Blueprint $table) {
            $table->id();
            $table->string('badge_text', 120)->default('Testimonials');
            $table->string('title_text', 255)->default('What Users Say');
            $table->timestamps();
        });

        DB::table('landing_page_testimonial_sections')->insert([
            'badge_text' => 'Testimonials',
            'title_text' => 'What Users Say',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_testimonial_sections');
    }
};
