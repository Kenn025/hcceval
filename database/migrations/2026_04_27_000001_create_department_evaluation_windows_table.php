<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('department_evaluation_windows', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('department_id');
            $table->string('status', 20)->default('active');
            $table->timestamp('date_opened')->nullable();
            $table->timestamp('date_closed')->nullable();
            $table->timestamps();

            $table->unique(['academic_year_id', 'department_id'], 'dept_eval_window_unique');
            $table->index(['department_id', 'status']);
            $table->foreign('academic_year_id')->references('id')->on('academic_year')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreign('branch_id')->references('id')->on('branch')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('department_id')->references('id')->on('department')->cascadeOnDelete()->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_evaluation_windows');
    }
};
