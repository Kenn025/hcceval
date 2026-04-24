<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bug_reports', function (Blueprint $table) {
            $table->id();
            $table->string('reporter_type');       // student, teacher, employee, admin
            $table->unsignedBigInteger('reporter_id');
            $table->string('reporter_name');
            $table->string('subject');
            $table->text('description');
            $table->string('severity')->default('medium'); // low, medium, high, critical
            $table->string('status')->default('open');     // open, in_progress, resolved, closed
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bug_reports');
    }
};
