<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\EducationLevel;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search', '');

        $departments = Department::query()
            ->with(['branch:id,name', 'educationLevel:id,year_level,section'])
            ->where('is_deleted', 0)
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Departments', [
            'departments' => $departments,
            'filters' => ['search' => $search],
            'branches' => Branch::query()->select('id', 'name')->where('is_deleted', 0)->orderBy('name')->get(),
            'educationLevels' => EducationLevel::query()
                ->select('id', 'year_level', 'section')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->orderBy('year_level')
                ->orderBy('section')
                ->get(),
        ]);
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
