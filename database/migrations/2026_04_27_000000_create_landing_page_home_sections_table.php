<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_home_sections', function (Blueprint $table) {
            $table->id();
            $table->string('badge_text', 120)->default('Thesis Project 2026');
            $table->string('title_text', 255)->default('Web-Based Multicampus Performance Evaluation System');
            $table->string('title_highlight_text', 120)->default('Multicampus');
            $table->text('subtitle_text')->nullable();
            $table->string('primary_cta_label', 120)->default('Start Evaluating');
            $table->string('primary_cta_target', 150)->default('login');
            $table->string('secondary_cta_label', 120)->default('Learn More');
            $table->string('secondary_cta_target', 150)->default('how-it-works');
            $table->string('background_video_path', 255)->nullable();
            $table->timestamps();
        });

        DB::table('landing_page_home_sections')->insert([
            'badge_text' => 'Thesis Project 2026',
            'title_text' => 'Web-Based Multicampus Performance Evaluation System',
            'title_highlight_text' => 'Multicampus',
            'subtitle_text' => 'A comprehensive holistic computerized faculty-peer-student-admin performance evaluation management system connecting all stakeholders.',
            'primary_cta_label' => 'Start Evaluating',
            'primary_cta_target' => 'login',
            'secondary_cta_label' => 'Learn More',
            'secondary_cta_target' => 'how-it-works',
            'background_video_path' => '/videos/hero-loop.mp4',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_home_sections');
    }
};
