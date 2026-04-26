<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_feature_sections', function (Blueprint $table) {
            $table->id();
            $table->string('badge_text', 120)->default('Features');
            $table->string('title_text', 255)->default('Powerful Capabilities');
            $table->text('subtitle_text')->nullable();
            $table->timestamps();
        });

        DB::table('landing_page_feature_sections')->insert([
            'badge_text' => 'Features',
            'title_text' => 'Powerful Capabilities',
            'subtitle_text' => 'Everything you need for comprehensive evaluation management',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_feature_sections');
    }
};
