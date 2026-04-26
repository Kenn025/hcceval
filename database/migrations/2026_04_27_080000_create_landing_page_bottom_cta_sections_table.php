<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_bottom_cta_sections', function (Blueprint $table) {
            $table->id();
            $table->string('title_text', 255)->default('Ready to Transform Evaluation?');
            $table->text('subtitle_text')->nullable();
            $table->string('primary_button_label', 120)->default('Sign in');
            $table->string('primary_button_target', 150)->default('login');
            $table->string('secondary_button_label', 120)->default('Contact Us');
            $table->string('secondary_button_target', 150)->default('contact');
            $table->timestamps();
        });

        DB::table('landing_page_bottom_cta_sections')->insert([
            'title_text' => 'Ready to Transform Evaluation?',
            'subtitle_text' => 'Join institutions already using MCH-PEMS for comprehensive performance evaluation.',
            'primary_button_label' => 'Sign in',
            'primary_button_target' => 'login',
            'secondary_button_label' => 'Contact Us',
            'secondary_button_target' => 'contact',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_bottom_cta_sections');
    }
};
