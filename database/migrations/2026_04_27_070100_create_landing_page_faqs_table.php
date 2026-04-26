<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_faqs', function (Blueprint $table) {
            $table->id();
            $table->string('question', 255);
            $table->text('answer')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('landing_page_faqs')->insert([
            [
                'question' => 'How does multi-campus evaluation work?',
                'answer' => 'Our system connects all campuses under one unified platform. Each campus maintains its own criteria while administrators can view aggregated data for comprehensive analysis across all locations.',
                'sort_order' => 1,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Are student evaluations truly anonymous?',
                'answer' => 'Yes, we use advanced encryption and anonymization techniques. Student and peer evaluations are completely confidential, ensuring honest and unbiased feedback.',
                'sort_order' => 2,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Can we customize evaluation forms?',
                'answer' => 'Absolutely! Administrators can create custom evaluation forms, set specific criteria for different roles, and adjust weighting based on institutional requirements.',
                'sort_order' => 3,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'What security measures are in place?',
                'answer' => 'We implement enterprise-grade security with SSL encryption, role-based access control, regular security audits, and compliance with data protection regulations.',
                'sort_order' => 4,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Is training provided?',
                'answer' => 'Yes, we provide comprehensive training materials, video tutorials, and dedicated support to ensure smooth adoption across all user roles.',
                'sort_order' => 5,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_faqs');
    }
};
