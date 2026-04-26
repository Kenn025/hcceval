<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('academic_year', function (Blueprint $table) {
            $table->unsignedInteger('total_questions')->default(0)->after('term');
            $table->unsignedInteger('question_submissions')->default(0)->after('total_questions');
            $table->unsignedInteger('total_submissions')->default(0)->after('question_submissions');
            $table->timestamp('date_opened')->nullable()->after('total_submissions');
            $table->timestamp('date_closed')->nullable()->after('date_opened');
        });
    }

    public function down(): void
    {
        Schema::table('academic_year', function (Blueprint $table) {
            $table->dropColumn([
                'total_questions',
                'question_submissions',
                'total_submissions',
                'date_opened',
                'date_closed',
            ]);
        });
    }
};
