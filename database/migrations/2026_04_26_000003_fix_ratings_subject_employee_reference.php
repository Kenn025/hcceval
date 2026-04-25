<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ratings_subject') || ! Schema::hasColumn('ratings_subject', 'teacher_id') || Schema::hasColumn('ratings_subject', 'employee_id')) {
            return;
        }

        Schema::disableForeignKeyConstraints();

        Schema::create('ratings_subject_new', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->integer('submission_count')->default(0);
            $table->boolean('is_archived')->default(false);
            $table->timestamp('archived_at')->nullable();
            $table->json('item_ratings')->nullable();
            $table->json('comments')->nullable();
            $table->json('overall_ratings')->nullable();
            $table->timestamps();
            $table->index('academic_year_id');
            $table->index('subject_id');
            $table->index('employee_id');
            $table->index('is_archived');
            $table->foreign('academic_year_id')->references('id')->on('academic_year')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('subject_id')->references('id')->on('subject')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('employee_id')->references('id')->on('employee')->nullOnDelete()->cascadeOnUpdate();
        });

        $rows = DB::table('ratings_subject')->orderBy('id')->get();

        foreach ($rows->chunk(100) as $chunk) {
            DB::table('ratings_subject_new')->insert($chunk->map(function (object $row): array {
                return [
                    'id' => $row->id,
                    'academic_year_id' => $row->academic_year_id,
                    'subject_id' => $row->subject_id,
                    'employee_id' => DB::table('employee')->where('id', $row->teacher_id)->exists() ? $row->teacher_id : null,
                    'submission_count' => $row->submission_count,
                    'is_archived' => $row->is_archived ?? 0,
                    'archived_at' => $row->archived_at ?? null,
                    'item_ratings' => $row->item_ratings,
                    'comments' => $row->comments,
                    'overall_ratings' => $row->overall_ratings,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ];
            })->all());
        }

        Schema::drop('ratings_subject');
        Schema::rename('ratings_subject_new', 'ratings_subject');

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        if (! Schema::hasTable('ratings_subject') || ! Schema::hasColumn('ratings_subject', 'employee_id') || Schema::hasColumn('ratings_subject', 'teacher_id')) {
            return;
        }

        Schema::disableForeignKeyConstraints();

        Schema::create('ratings_subject_old', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_year_id')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->unsignedBigInteger('teacher_id')->nullable();
            $table->integer('submission_count')->default(0);
            $table->boolean('is_archived')->default(false);
            $table->timestamp('archived_at')->nullable();
            $table->json('item_ratings')->nullable();
            $table->json('comments')->nullable();
            $table->json('overall_ratings')->nullable();
            $table->timestamps();
            $table->index('academic_year_id');
            $table->index('subject_id');
            $table->index('teacher_id');
            $table->index('is_archived');
            $table->foreign('academic_year_id')->references('id')->on('academic_year')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('subject_id')->references('id')->on('subject')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('teacher_id')->references('id')->on('teacher')->nullOnDelete()->cascadeOnUpdate();
        });

        $rows = DB::table('ratings_subject')->orderBy('id')->get();

        foreach ($rows->chunk(100) as $chunk) {
            DB::table('ratings_subject_old')->insert($chunk->map(function (object $row): array {
                $teacherId = DB::table('teacher')->where('id', $row->employee_id)->exists()
                    ? $row->employee_id
                    : null;

                return [
                    'id' => $row->id,
                    'academic_year_id' => $row->academic_year_id,
                    'subject_id' => $row->subject_id,
                    'teacher_id' => $teacherId,
                    'submission_count' => $row->submission_count,
                    'is_archived' => $row->is_archived ?? 0,
                    'archived_at' => $row->archived_at ?? null,
                    'item_ratings' => $row->item_ratings,
                    'comments' => $row->comments,
                    'overall_ratings' => $row->overall_ratings,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ];
            })->all());
        }

        Schema::drop('ratings_subject');
        Schema::rename('ratings_subject_old', 'ratings_subject');

        Schema::enableForeignKeyConstraints();
    }
};
