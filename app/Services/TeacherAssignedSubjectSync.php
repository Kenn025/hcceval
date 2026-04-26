<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TeacherAssignedSubjectSync
{
    public function syncAll(): void
    {
        if (! Schema::hasTable('teacher') || ! Schema::hasColumn('teacher', 'assigned_subject_ids')) {
            return;
        }

        $subjectIdsByTeacher = [];

        if (Schema::hasTable('subject')) {
            DB::table('subject')
                ->select('id', 'teacher_id')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->orderBy('id')
                ->get()
                ->each(function ($subject) use (&$subjectIdsByTeacher) {
                    foreach ($this->idList($subject->teacher_id) as $teacherId) {
                        $subjectIdsByTeacher[$teacherId][] = (int) $subject->id;
                    }
                });
        }

        if (Schema::hasTable('education_level') && Schema::hasColumn('education_level', 'subject_teacher_map')) {
            DB::table('education_level')
                ->select('subject_teacher_map')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->get()
                ->each(function ($level) use (&$subjectIdsByTeacher) {
                    foreach ($this->mapValue($level->subject_teacher_map) as $subjectId => $teacherId) {
                        $teacherId = (int) $teacherId;
                        $subjectId = (int) $subjectId;

                        if ($teacherId > 0 && $subjectId > 0) {
                            $subjectIdsByTeacher[$teacherId][] = $subjectId;
                        }
                    }
                });
        }

        if (Schema::hasTable('subject_sections')) {
            $query = DB::table('subject_sections')
                ->select('subject_id', 'teacher_employee_id')
                ->whereNotNull('teacher_employee_id')
                ->whereNotNull('subject_id');

            if (Schema::hasColumn('subject_sections', 'is_active')) {
                $query->where('is_active', 1);
            }

            if (Schema::hasColumn('subject_sections', 'deleted_at')) {
                $query->whereNull('deleted_at');
            }

            $query->get()
                ->each(function ($section) use (&$subjectIdsByTeacher) {
                    $subjectIdsByTeacher[(int) $section->teacher_employee_id][] = (int) $section->subject_id;
                });
        }

        DB::table('teacher')
            ->select('id')
            ->orderBy('id')
            ->get()
            ->each(function ($teacher) use ($subjectIdsByTeacher) {
                $subjectIds = collect($subjectIdsByTeacher[(int) $teacher->id] ?? [])
                    ->map(fn ($id) => (int) $id)
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();

                DB::table('teacher')
                    ->where('id', $teacher->id)
                    ->update(['assigned_subject_ids' => json_encode($subjectIds)]);
            });
    }

    private function idList(mixed $value): array
    {
        if (is_string($value)) {
            $value = json_decode($value, true) ?: [];
        }

        return collect($value ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function mapValue(mixed $value): Collection
    {
        if (is_string($value)) {
            $value = json_decode($value, true) ?: [];
        }

        return collect(is_array($value) ? $value : []);
    }
}
