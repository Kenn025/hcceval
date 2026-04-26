<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_headers', function (Blueprint $table) {
            $table->id();
            $table->string('label', 100);
            $table->string('target', 150);
            $table->enum('target_type', ['section', 'url'])->default('section');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('open_in_new_tab')->default(false);
            $table->timestamps();
        });

        DB::table('landing_page_headers')->insert([
            ['label' => 'Home', 'target' => 'home', 'target_type' => 'section', 'sort_order' => 1, 'is_active' => 1, 'open_in_new_tab' => 0, 'created_at' => now(), 'updated_at' => now()],
            ['label' => 'Features', 'target' => 'features', 'target_type' => 'section', 'sort_order' => 2, 'is_active' => 1, 'open_in_new_tab' => 0, 'created_at' => now(), 'updated_at' => now()],
            ['label' => 'Roles', 'target' => 'roles', 'target_type' => 'section', 'sort_order' => 3, 'is_active' => 1, 'open_in_new_tab' => 0, 'created_at' => now(), 'updated_at' => now()],
            ['label' => 'How It Works', 'target' => 'how-it-works', 'target_type' => 'section', 'sort_order' => 4, 'is_active' => 1, 'open_in_new_tab' => 0, 'created_at' => now(), 'updated_at' => now()],
            ['label' => 'FAQ', 'target' => 'faq', 'target_type' => 'section', 'sort_order' => 5, 'is_active' => 1, 'open_in_new_tab' => 0, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_headers');
    }
};
