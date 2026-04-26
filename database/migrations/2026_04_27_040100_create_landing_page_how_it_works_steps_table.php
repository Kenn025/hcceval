<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_how_it_works_steps', function (Blueprint $table) {
            $table->id();
            $table->string('step_number', 10)->default('01');
            $table->string('title', 150);
            $table->text('subtitle')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('landing_page_how_it_works_steps')->insert([
            [
                'step_number' => '01',
                'title' => 'Register',
                'subtitle' => 'Create account and select your role',
                'sort_order' => 1,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'step_number' => '02',
                'title' => 'Configure',
                'subtitle' => 'Set up evaluation criteria',
                'sort_order' => 2,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'step_number' => '03',
                'title' => 'Evaluate',
                'subtitle' => 'Complete evaluations forms',
                'sort_order' => 3,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'step_number' => '04',
                'title' => 'Analyze',
                'subtitle' => 'View reports and insights',
                'sort_order' => 4,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_how_it_works_steps');
    }
};

