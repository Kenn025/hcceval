<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_footer_sections', function (Blueprint $table) {
            $table->id();
            $table->string('logo_icon', 80)->default('graduation');
            $table->string('logo_path', 255)->nullable();
            $table->string('title_text', 150)->default('MCH-PEMS');
            $table->text('subtitle_text')->nullable();
            $table->string('quick_links_heading', 120)->default('Quick Links');
            $table->string('link_1_label', 120)->default('Home');
            $table->string('link_1_target', 150)->default('home');
            $table->string('link_2_label', 120)->default('Features');
            $table->string('link_2_target', 150)->default('features');
            $table->string('link_3_label', 120)->default('Roles');
            $table->string('link_3_target', 150)->default('roles');
            $table->string('link_4_label', 120)->default('Contact');
            $table->string('link_4_target', 150)->default('contact');
            $table->string('contact_heading', 120)->default('Contact');
            $table->string('contact_line_1', 255)->default('mchpems@university.edu');
            $table->string('contact_line_2', 120)->default('+63 912 345 6789');
            $table->string('contact_line_3', 255)->default('University Campus');
            $table->string('social_1_label', 20)->default('facebook');
            $table->string('social_1_link', 255)->nullable();
            $table->string('social_2_label', 20)->default('instagram');
            $table->string('social_2_link', 255)->nullable();
            $table->string('social_3_label', 20)->default('linkedin');
            $table->string('social_3_link', 255)->nullable();
            $table->string('copyright_suffix_text', 255)->default('All rights reserved. Thesis Project.');
            $table->timestamps();
        });

        DB::table('landing_page_footer_sections')->insert([
            'logo_icon' => 'graduation',
            'logo_path' => null,
            'title_text' => 'MCH-PEMS',
            'subtitle_text' => 'Multicampus Holistic Computerized Faculty-Peer-Student-Admin Performance Evaluation Management System.',
            'quick_links_heading' => 'Quick Links',
            'link_1_label' => 'Home',
            'link_1_target' => 'home',
            'link_2_label' => 'Features',
            'link_2_target' => 'features',
            'link_3_label' => 'Roles',
            'link_3_target' => 'roles',
            'link_4_label' => 'Contact',
            'link_4_target' => 'contact',
            'contact_heading' => 'Contact',
            'contact_line_1' => 'mchpems@university.edu',
            'contact_line_2' => '+63 912 345 6789',
            'contact_line_3' => 'University Campus',
            'social_1_label' => 'facebook',
            'social_1_link' => 'https://facebook.com',
            'social_2_label' => 'instagram',
            'social_2_link' => 'https://instagram.com',
            'social_3_label' => 'linkedin',
            'social_3_link' => 'https://linkedin.com',
            'copyright_suffix_text' => 'All rights reserved. Thesis Project.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_footer_sections');
    }
};
