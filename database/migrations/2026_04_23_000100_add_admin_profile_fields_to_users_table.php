<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('display_name')->nullable()->after('name');
            $table->string('role')->default('overall_admin')->after('display_name');
            $table->unsignedBigInteger('branch_id')->nullable()->after('role');
            $table->string('legacy_source')->nullable()->after('branch_id');
            $table->unsignedBigInteger('legacy_id')->nullable()->after('legacy_source');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'display_name',
                'role',
                'branch_id',
                'legacy_source',
                'legacy_id',
            ]);
        });
    }
};
