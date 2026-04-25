<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('education_level', function (Blueprint $table) {
            $table->unsignedBigInteger('strand_id')->nullable()->after('program_id');
            $table->index('strand_id');
            $table->foreign('strand_id')->references('id')->on('strand')->nullOnDelete()->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('education_level', function (Blueprint $table) {
            $table->dropForeign(['strand_id']);
            $table->dropIndex(['strand_id']);
            $table->dropColumn('strand_id');
        });
    }
};
