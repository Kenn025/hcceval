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
            ->with(['branch:id,name,code', 'educationLevel:id,name,code'])
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Departments', [
            'departments' => $departments,
            'filters' => ['search' => $search],
            'branches' => Branch::select('id', 'name', 'code')->orderBy('name')->get(),
            'educationLevels' => EducationLevel::select('id', 'name', 'code')->where('is_active', 1)->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:departments,code',
            'name' => 'required|string|max:150',
            'branch_id' => 'required|exists:branches,id',
            'education_level_id' => 'required|exists:education_levels,id',
            'is_active' => 'boolean',
        ]);

        Department::create($validated);

        return back()->with('success', 'Department created successfully.');
    }

    public function update(Request $request, Department $department)
    {
        $validated = $request->validate([
            'code' => "required|string|max:50|unique:departments,code,{$department->id}",
            'name' => 'required|string|max:150',
            'branch_id' => 'required|exists:branches,id',
            'education_level_id' => 'required|exists:education_levels,id',
            'is_active' => 'boolean',
        ]);

        $department->update($validated);

        return back()->with('success', 'Department updated successfully.');
    }

    public function destroy(Department $department)
    {
        $department->delete();

        return back()->with('success', 'Department deleted.');
    }
}
