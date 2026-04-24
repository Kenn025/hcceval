<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search', '');
        $requestedBranchId = $request->integer('branch_id');

        $branches = Branch::query()
            ->select('id', 'name', 'code')
            ->where('is_deleted', 0)
            ->where('code', '!=', 'OVERALL')
            ->orderBy('name')
            ->get();

        $selectedBranchId = $branches->contains('id', $requestedBranchId)
            ? $requestedBranchId
            : $branches->first()?->id;

        $departments = Department::query()
            ->with(['branch:id,name'])
            ->where('is_deleted', 0)
            ->when($selectedBranchId, fn ($query) => $query->where('branch_id', $selectedBranchId))
            ->when($search, function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhereHas('branch', fn ($branchQuery) => $branchQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Departments', [
            'departments' => $departments,
            'filters' => ['search' => $search, 'branch_id' => $selectedBranchId],
            'branches' => $branches,
            'selectedBranchId' => $selectedBranchId,
        ]);
    }

    public function toggleActivation(Department $department)
    {
        if ((bool) $department->is_deleted) {
            abort(404);
        }

        $department->update(['is_activated' => ! $department->is_activated]);

        return back()->with('success', $department->is_activated
            ? 'Department activated successfully.'
            : 'Department deactivated successfully.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'branch_id' => 'required|exists:branch,id',
            'education_level_id' => 'nullable|exists:education_level,id',
            'is_activated' => 'boolean',
        ]);

        Department::create($validated);

        return back()->with('success', 'Department created successfully.');
    }

    public function update(Request $request, Department $department)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'branch_id' => 'required|exists:branch,id',
            'education_level_id' => 'nullable|exists:education_level,id',
            'is_activated' => 'boolean',
        ]);

        $department->update($validated);

        return back()->with('success', 'Department updated successfully.');
    }

    public function destroy(Department $department)
    {
        $department->update(['is_deleted' => 1]);

        return back()->with('success', 'Department deleted.');
    }
}
