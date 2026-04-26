<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_features', function (Blueprint $table) {
            $table->id();
            $table->string('title', 150);
            $table->text('subtitle')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('landing_page_features')->insert([
            [
                'title' => 'Real-Time Analytics',
                'subtitle' => 'Live performance tracking with interactive charts and comprehensive dashboards.',
                'sort_order' => 1,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Secure & Private',
                'subtitle' => 'Enterprise-grade encryption ensuring all evaluations remain confidential.',
                'sort_order' => 2,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Multi-Device',
                'subtitle' => 'Responsive design accessible on desktop, tablet, and mobile devices.',
                'sort_order' => 3,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Multi-Campus',
                'subtitle' => 'Seamlessly connect and manage evaluations across multiple campuses.',
                'sort_order' => 4,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Customizable',
                'subtitle' => 'Tailor evaluation criteria and workflows to your institution needs.',
                'sort_order' => 5,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Detailed Reports',
                'subtitle' => 'Generate comprehensive PDF reports with actionable insights.',
                'sort_order' => 6,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_features');
    }
};
