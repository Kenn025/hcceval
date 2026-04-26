<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_stats', function (Blueprint $table) {
            $table->id();
            $table->string('stat_key', 50)->unique();
            $table->string('label', 120);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('landing_page_stats')->insert([
            ['stat_key' => 'students', 'label' => 'Active Students', 'sort_order' => 1, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['stat_key' => 'faculty', 'label' => 'Active Faculty', 'sort_order' => 2, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['stat_key' => 'campuses', 'label' => 'Active Campuses', 'sort_order' => 3, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['stat_key' => 'evaluations', 'label' => 'Evaluations Submitted', 'sort_order' => 4, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_stats');
    }
};
