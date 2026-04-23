<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\EducationLevel;
use App\Models\Program;
use App\Models\Strand;
use App\Models\YearLevel;
use Illuminate\Http\Request;
use Inertia\Inertia;

class YearLevelController extends Controller
{
    public function index(Request $request, string $educationType = 'college')
    {
        $search = $request->input('search', '');

        $levelMap = [
            'college' => 'College',
            'senior-high' => 'Senior High School',
            'junior-high' => 'Junior High School',
            'grade-school' => 'Elementary',
        ];

        $levelName = $levelMap[$educationType] ?? 'College';

        $educationLevel = EducationLevel::where('name', $levelName)->first();

        $yearLevels = YearLevel::query()
            ->with(['department:id,name', 'program:id,name', 'strand:id,name', 'educationLevel:id,name'])
            ->when($educationLevel, fn ($q) => $q->where('education_level_id', $educationLevel->id))
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%"))
            ->orderBy('level_no')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/YearLevels', [
            'yearLevels' => $yearLevels,
            'filters' => ['search' => $search],
            'educationType' => $educationType,
            'educationLevelName' => $levelName,
            'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            'programs' => Program::select('id', 'name')->orderBy('name')->get(),
            'strands' => Strand::select('id', 'name')->orderBy('name')->get(),
            'educationLevels' => EducationLevel::select('id', 'name')->where('is_active', 1)->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'education_level_id' => 'required|exists:education_levels,id',
            'program_id' => 'nullable|exists:programs,id',
            'strand_id' => 'nullable|exists:strands,id',
            'code' => 'required|string|max:100|unique:year_levels,code',
            'name' => 'required|string|max:150',
            'level_no' => 'required|integer|min:1',
            'is_active' => 'boolean',
        ]);

        YearLevel::create($validated);

        return back()->with('success', 'Year level created successfully.');
    }

    public function update(Request $request, YearLevel $yearLevel)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'education_level_id' => 'required|exists:education_levels,id',
            'program_id' => 'nullable|exists:programs,id',
            'strand_id' => 'nullable|exists:strands,id',
            'code' => "required|string|max:100|unique:year_levels,code,{$yearLevel->id}",
            'name' => 'required|string|max:150',
            'level_no' => 'required|integer|min:1',
            'is_active' => 'boolean',
        ]);

        $yearLevel->update($validated);

        return back()->with('success', 'Year level updated successfully.');
    }

    public function destroy(YearLevel $yearLevel)
    {
        $yearLevel->delete();

        return back()->with('success', 'Year level deleted.');
    }
}
