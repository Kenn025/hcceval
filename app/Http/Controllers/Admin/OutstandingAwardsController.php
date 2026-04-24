<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OutstandingAwardsController extends Controller
{
    public function index(Request $request): Response
    {
        $schoolYear = $request->input('school_year', '');
        $branchId   = $this->scopedBranchId();

        $rows = DB::table('overall_ratings as o')
            ->leftJoin('branch as b', 'b.id', '=', 'o.branch_id')
            ->leftJoin('academic_year as ay', 'ay.id', '=', 'o.academic_year_id')
            ->select(
                'o.id',
                'b.name as branch_name',
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year"),
                'ay.term as semester',
                'o.outstanding_teacher',
                'o.outstanding_chair',
                'o.outstanding_program',
                'o.outstanding_strand',
                'o.updated_at'
            )
            ->when($branchId, fn ($q) => $q->where('o.branch_id', $branchId))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]))
            ->orderByDesc('ay.from_year')
            ->get()
            ->map(fn ($r) => [
                'id'          => $r->id,
                'branch_name' => $r->branch_name,
                'school_year' => $r->school_year,
                'semester'    => $r->semester,
                'teachers'    => json_decode($r->outstanding_teacher ?? '[]', true) ?: [],
                'chairs'      => json_decode($r->outstanding_chair ?? '[]', true) ?: [],
                'programs'    => json_decode($r->outstanding_program ?? '[]', true) ?: [],
                'strands'     => json_decode($r->outstanding_strand ?? '[]', true) ?: [],
                'updated_at'  => $r->updated_at,
            ])
            ->toArray();

        $schoolYears = DB::table('academic_year')
            ->select(DB::raw("CONCAT(from_year, '-', to_year) as label"))
            ->orderByDesc('from_year')
            ->pluck('label')
            ->toArray();

        return Inertia::render('Admin/OutstandingAwards', [
            'awards'      => $rows,
            'filters'     => ['school_year' => $schoolYear],
            'schoolYears' => $schoolYears,
        ]);
    }

    public function recompute(): RedirectResponse
    {
        Artisan::call('eval:outstanding');
        return back()->with('success', 'Outstanding awards recomputed.');
    }
}
