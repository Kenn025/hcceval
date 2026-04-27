<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('bug_reports')) {
            return;
        }

        Schema::create('bug_reports', function (Blueprint $table) {
            $table->id();
            $table->string('reporter_type', 30)->default('unknown');
            $table->unsignedBigInteger('reporter_id')->default(0);
            $table->string('reporter_name', 150)->default('Unknown');
            $table->string('subject', 255);
            $table->text('description');
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['new', 'in_progress', 'resolved'])->default('new');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bug_reports');
    }
};
