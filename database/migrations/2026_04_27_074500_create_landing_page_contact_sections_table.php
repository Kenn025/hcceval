<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_contact_sections', function (Blueprint $table) {
            $table->id();
            $table->string('badge_text', 120)->default('Contact');
            $table->string('title_text', 255)->default('Get In Touch');
            $table->text('subtitle_text')->nullable();
            $table->string('email_label', 80)->default('Email');
            $table->string('email_value', 255)->default('mchpems@university.edu');
            $table->string('location_label', 80)->default('Location');
            $table->string('location_value', 255)->default('University Campus, Philippines');
            $table->string('phone_label', 80)->default('Phone');
            $table->string('phone_value', 80)->default('+63 912 345 6789');
            $table->string('form_name_label', 120)->default('Full Name');
            $table->string('form_name_placeholder', 255)->default('Enter your name');
            $table->string('form_email_label', 120)->default('Email');
            $table->string('form_email_placeholder', 255)->default('Enter your email');
            $table->string('form_message_label', 120)->default('Message');
            $table->string('form_message_placeholder', 255)->default('How can we help?');
            $table->string('form_button_label', 120)->default('Send Message');
            $table->timestamps();
        });

        DB::table('landing_page_contact_sections')->insert([
            'badge_text' => 'Contact',
            'title_text' => 'Get In Touch',
            'subtitle_text' => "Have questions about MCH-PEMS? We're here to help.",
            'email_label' => 'Email',
            'email_value' => 'mchpems@university.edu',
            'location_label' => 'Location',
            'location_value' => 'University Campus, Philippines',
            'phone_label' => 'Phone',
            'phone_value' => '+63 912 345 6789',
            'form_name_label' => 'Full Name',
            'form_name_placeholder' => 'Enter your name',
            'form_email_label' => 'Email',
            'form_email_placeholder' => 'Enter your email',
            'form_message_label' => 'Message',
            'form_message_placeholder' => 'How can we help?',
            'form_button_label' => 'Send Message',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_contact_sections');
    }
};
