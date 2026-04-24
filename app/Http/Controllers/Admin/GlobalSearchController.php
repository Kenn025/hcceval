<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GlobalSearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->input('q', ''));
        if (strlen($q) < 2) {
            return response()->json(['results' => []]);
        }

        $like     = "%{$q}%";
        $branchId = $this->scopedBranchId();

        $students = DB::table('student')
            ->where('is_deleted', 0)
            ->when($branchId, fn ($x) => $x->where('branch_id', $branchId))
            ->where(fn ($x) => $x->where('firstname', 'like', $like)
                ->orWhere('lastname', 'like', $like)
                ->orWhere('code', 'like', $like)
                ->orWhere('email', 'like', $like))
            ->limit(5)
            ->get(['id', 'code', 'firstname', 'lastname'])
            ->map(fn ($r) => [
                'type'  => 'Student',
                'label' => trim("{$r->firstname} {$r->lastname}") . " ({$r->code})",
                'url'   => route('admin.students', ['search' => $q]),
            ]);

        $teachers = DB::table('teacher')
            ->where('is_deleted', 0)
            ->when($branchId, fn ($x) => $x->where('branch_id', $branchId))
            ->where(fn ($x) => $x->where('firstname', 'like', $like)
                ->orWhere('lastname', 'like', $like)
                ->orWhere('code', 'like', $like)
                ->orWhere('email', 'like', $like))
            ->limit(5)
            ->get(['id', 'code', 'firstname', 'lastname'])
            ->map(fn ($r) => [
                'type'  => 'Teacher',
                'label' => trim("{$r->firstname} {$r->lastname}") . " ({$r->code})",
                'url'   => route('admin.teachers', ['search' => $q]),
            ]);

        $employees = DB::table('employee')
            ->where('is_deleted', 0)
            ->when($branchId, fn ($x) => $x->where('branch_id', $branchId))
            ->where(fn ($x) => $x->where('firstname', 'like', $like)
                ->orWhere('lastname', 'like', $like)
                ->orWhere('code', 'like', $like)
                ->orWhere('email', 'like', $like))
            ->limit(5)
            ->get(['id', 'code', 'firstname', 'lastname'])
            ->map(fn ($r) => [
                'type'  => 'Employee',
                'label' => trim("{$r->firstname} {$r->lastname}") . " ({$r->code})",
                'url'   => route('admin.employees', ['search' => $q]),
            ]);

        $subjects = DB::table('subject')
            ->where('is_deleted', 0)
            ->where(fn ($x) => $x->where('name', 'like', $like)->orWhere('code', 'like', $like))
            ->limit(5)
            ->get(['id', 'code', 'name'])
            ->map(fn ($r) => [
                'type'  => 'Subject',
                'label' => "{$r->name} ({$r->code})",
                'url'   => route('admin.college.subjects', ['search' => $q]),
            ]);

        return response()->json([
            'results' => collect()
                ->concat($students)
                ->concat($teachers)
                ->concat($employees)
                ->concat($subjects)
                ->values(),
        ]);
    }
}
