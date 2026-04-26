<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_roles_section', function (Blueprint $table) {
            $table->id();
            $table->string('badge_text', 120)->default('User Roles');
            $table->string('title_text', 255)->default('Four Integrated Roles');
            $table->text('subtitle_text')->nullable();
            $table->timestamps();
        });

        DB::table('landing_page_roles_section')->insert([
            'badge_text' => 'User Roles',
            'title_text' => 'Four Integrated Roles',
            'subtitle_text' => 'Click a role to explore its capabilities',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_roles_section');
    }
};
