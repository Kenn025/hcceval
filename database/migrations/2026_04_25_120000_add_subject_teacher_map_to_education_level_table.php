<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('education_level', function (Blueprint $table) {
            $table->json('subject_teacher_map')->nullable()->after('subject_id');
        });
    }

    public function down(): void
    {
        Schema::table('education_level', function (Blueprint $table) {
            $table->dropColumn('subject_teacher_map');
        });
    }
};
