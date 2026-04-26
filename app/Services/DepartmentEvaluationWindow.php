<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DepartmentEvaluationWindow
{
    public static function isOpen(?int $departmentId, ?int $academicYearId): bool
    {
        if (! $departmentId || ! $academicYearId || ! Schema::hasTable('department_evaluation_windows')) {
            return false;
        }

        return DB::table('department_evaluation_windows')
            ->where('department_id', $departmentId)
            ->where('academic_year_id', $academicYearId)
            ->where('status', 'active')
            ->where(function ($query) {
                $query->whereNull('date_opened')
                    ->orWhere('date_opened', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('date_closed')
                    ->orWhere('date_closed', '>', now());
            })
            ->exists();
    }

    public static function hasStarted(?int $departmentId, ?int $academicYearId): bool
    {
        if (! $departmentId || ! $academicYearId || ! Schema::hasTable('department_evaluation_windows')) {
            return false;
        }

        return DB::table('department_evaluation_windows')
            ->where('department_id', $departmentId)
            ->where('academic_year_id', $academicYearId)
            ->whereNotNull('date_opened')
            ->where('date_opened', '<=', now())
            ->exists();
    }

    public static function openDepartmentIds(?int $academicYearId): array
    {
        if (! $academicYearId || ! Schema::hasTable('department_evaluation_windows')) {
            return [];
        }

        return DB::table('department_evaluation_windows')
            ->where('academic_year_id', $academicYearId)
            ->where('status', 'active')
            ->where(function ($query) {
                $query->whereNull('date_opened')
                    ->orWhere('date_opened', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('date_closed')
                    ->orWhere('date_closed', '>', now());
            })
            ->pluck('department_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
}
