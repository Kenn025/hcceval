<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('landing_page_testimonials')) {
            Schema::create('landing_page_testimonials', function (Blueprint $table) {
                $table->id();
                $table->string('submitted_by_type', 20)->default('manual');
                $table->unsignedBigInteger('submitted_by_id')->nullable();
                $table->string('first_name', 120);
                $table->string('last_name', 120)->nullable();
                $table->string('role', 150)->nullable();
                $table->string('profile_photo_path', 255)->nullable();
                $table->text('feedback');
                $table->string('status', 20)->default('pending');
                $table->unsignedInteger('sort_order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['status', 'is_active', 'sort_order'], 'lp_testi_status_sort_idx');
                $table->index(['submitted_by_type', 'submitted_by_id'], 'lp_testi_submitter_idx');
            });
        }

        if ((int) DB::table('landing_page_testimonials')->count() > 0) {
            return;
        }

        DB::table('landing_page_testimonials')->insert([
            [
                'submitted_by_type' => 'manual',
                'submitted_by_id' => null,
                'first_name' => 'Maria',
                'last_name' => 'Santos',
                'role' => 'Dean of Engineering',
                'profile_photo_path' => null,
                'feedback' => 'This system has revolutionized our evaluation process. The holistic approach provides invaluable insights we never had before.',
                'status' => 'approved',
                'sort_order' => 1,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'submitted_by_type' => 'manual',
                'submitted_by_id' => null,
                'first_name' => 'Juan',
                'last_name' => 'Cruz',
                'role' => 'Faculty Member',
                'profile_photo_path' => null,
                'feedback' => 'The peer evaluation feature has fostered continuous improvement. I can track my growth with actionable feedback.',
                'status' => 'approved',
                'sort_order' => 2,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'submitted_by_type' => 'manual',
                'submitted_by_id' => null,
                'first_name' => 'Ana',
                'last_name' => 'Reyes',
                'role' => 'Administrator',
                'profile_photo_path' => null,
                'feedback' => 'Managing evaluations across campuses is now seamless. The analytics dashboard provides real-time insights.',
                'status' => 'approved',
                'sort_order' => 3,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_testimonials');
    }
};
