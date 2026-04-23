<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Subject;
use App\Models\YearLevel;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubjectController extends Controller
{
    public function index(Request $request, string $educationType = 'college')
    {
        $search = $request->input('search', '');

        $levelMap = [
            'college' => 'College',
            'senior-high' => 'Senior High',
            'junior-high' => 'Junior High',
            'grade-school' => 'Elementary',
        ];

        $levelName = $levelMap[$educationType] ?? 'College';

        $subjects = Subject::query()
            ->with(['department:id,name', 'yearLevel:id,name'])
            ->when($levelName, fn ($q) => $q->where('education_level', $levelName))
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Subjects', [
            'subjects' => $subjects,
            'filters' => ['search' => $search],
            'educationType' => $educationType,
            'educationLevelName' => $levelName,
            'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            'yearLevels' => YearLevel::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'year_level_id' => 'nullable|exists:year_levels,id',
            'code' => 'required|string|max:50|unique:subjects,code',
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'units' => 'nullable|numeric|min:0',
            'term_type' => 'nullable|string|max:50',
            'term' => 'nullable|string|max:50',
            'education_level' => 'nullable|string|max:100',
            'grade_level' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        Subject::create($validated);

        return back()->with('success', 'Subject created successfully.');
    }

    public function update(Request $request, Subject $subject)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'year_level_id' => 'nullable|exists:year_levels,id',
            'code' => "required|string|max:50|unique:subjects,code,{$subject->id}",
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'units' => 'nullable|numeric|min:0',
            'term_type' => 'nullable|string|max:50',
            'term' => 'nullable|string|max:50',
            'education_level' => 'nullable|string|max:100',
            'grade_level' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $subject->update($validated);

        return back()->with('success', 'Subject updated successfully.');
    }

    public function destroy(Subject $subject)
    {
        $subject->delete();

        return back()->with('success', 'Subject deleted.');
    }
}
