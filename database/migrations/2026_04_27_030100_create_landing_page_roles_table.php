<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_roles', function (Blueprint $table) {
            $table->id();
            $table->string('title', 120);
            $table->text('desc_text')->nullable();
            $table->json('features')->nullable();
            $table->unsignedTinyInteger('progress')->default(0);
            $table->string('icon_type', 50)->default('faculty');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('landing_page_roles')->insert([
            [
                'title' => 'Faculty',
                'desc_text' => 'Comprehensive evaluation tools for academic professionals',
                'features' => json_encode(['Self-Assessment Portal', 'Peer Review Access', 'Student Feedback View', 'Performance History', 'Development Reports']),
                'progress' => 85,
                'icon_type' => 'faculty',
                'sort_order' => 1,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Peer',
                'desc_text' => 'Collaborative evaluation between colleagues',
                'features' => json_encode(['Anonymous Reviews', '360° Assessment', 'Teaching Observation', 'Collaborative Goals', 'Best Practices Share']),
                'progress' => 78,
                'icon_type' => 'peer',
                'sort_order' => 2,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Student',
                'desc_text' => 'Student-centered faculty evaluation system',
                'features' => json_encode(['Course Feedback', 'Anonymous Surveys', 'Learning Outcomes', 'Suggestion Portal', 'Progress Tracking']),
                'progress' => 92,
                'icon_type' => 'student',
                'sort_order' => 3,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Administrator',
                'desc_text' => 'Complete system oversight and management',
                'features' => json_encode(['Analytics Dashboard', 'User Management', 'Report Generation', 'Campus Settings', 'System Configuration']),
                'progress' => 95,
                'icon_type' => 'admin',
                'sort_order' => 4,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_roles');
    }
};
