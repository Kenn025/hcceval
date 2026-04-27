<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_comment_reviews', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('evaluation_submission_id');
            $table->boolean('is_reviewed')->default(false);
            $table->boolean('is_hidden')->default(false);
            $table->unsignedBigInteger('reviewed_by_admin_id')->nullable();
            $table->unsignedBigInteger('hidden_by_admin_id')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('hidden_at')->nullable();
            $table->timestamps();

            $table->unique('evaluation_submission_id', 'evaluation_comment_review_submission_unique');
            $table->index(['is_reviewed', 'is_hidden']);
            $table->foreign('evaluation_submission_id', 'evaluation_comment_review_submission_fk')
                ->references('id')
                ->on('evaluation_submissions')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreign('reviewed_by_admin_id')->references('id')->on('admin')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('hidden_by_admin_id')->references('id')->on('admin')->nullOnDelete()->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_comment_reviews');
    }
};
