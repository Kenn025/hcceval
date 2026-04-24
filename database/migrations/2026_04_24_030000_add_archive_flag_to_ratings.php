<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['ratings_subject', 'ratings_peer', 'ratings_employee', 'ratings_head', 'ratings_branch'] as $table) {
            if (Schema::hasTable($table) && ! Schema::hasColumn($table, 'is_archived')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->boolean('is_archived')->default(false)->after('submission_count');
                    $t->timestamp('archived_at')->nullable()->after('is_archived');
                    $t->index('is_archived');
                });
            }
        }
    }

    public function down(): void
    {
        foreach (['ratings_subject', 'ratings_peer', 'ratings_employee', 'ratings_head', 'ratings_branch'] as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'is_archived')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropIndex([$table . '_is_archived_index']);
                    $t->dropColumn(['is_archived', 'archived_at']);
                });
            }
        }
    }
};
