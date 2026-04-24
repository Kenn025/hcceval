<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_subject', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('program_id')->nullable();
            $table->unsignedBigInteger('questionnaire_id')->nullable();
            $table->json('subject_ids')->nullable();
            $table->boolean('is_activated')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();

            $table->index('program_id');
            $table->index('questionnaire_id');
            $table->foreign('program_id')->references('id')->on('program')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('questionnaire_id')->references('id')->on('questionnaires')->nullOnDelete()->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_subject');
    }
};
