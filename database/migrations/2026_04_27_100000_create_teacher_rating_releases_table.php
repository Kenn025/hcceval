<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_rating_releases', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('teacher_id');
            $table->string('rating_type', 30);
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->unsignedBigInteger('released_by_admin_id')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->timestamps();

            $table->unique(['academic_year_id', 'teacher_id', 'rating_type', 'subject_id'], 'teacher_rating_release_unique');
            $table->index(['teacher_id', 'rating_type']);
            $table->foreign('academic_year_id')->references('id')->on('academic_year')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('branch_id')->references('id')->on('branch')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('teacher_id')->references('id')->on('teacher')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreign('subject_id')->references('id')->on('subject')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('released_by_admin_id')->references('id')->on('admin')->nullOnDelete()->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_rating_releases');
    }
};
