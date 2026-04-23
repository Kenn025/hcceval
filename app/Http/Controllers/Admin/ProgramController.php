<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Program;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProgramController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search', '');

        $programs = Program::query()
            ->with(['department:id,name,code'])
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Programs', [
            'programs' => $programs,
            'filters' => ['search' => $search],
            'departments' => Department::select('id', 'name', 'code')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'code' => 'required|string|max:50|unique:programs,code',
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'program_type' => 'nullable|string|max:50',
            'duration_years' => 'nullable|integer|min:1',
            'total_units' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        Program::create($validated);

        return back()->with('success', 'Program created successfully.');
    }

    public function update(Request $request, Program $program)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'code' => "required|string|max:50|unique:programs,code,{$program->id}",
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'program_type' => 'nullable|string|max:50',
            'duration_years' => 'nullable|integer|min:1',
            'total_units' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $program->update($validated);

        return back()->with('success', 'Program updated successfully.');
    }

    public function destroy(Program $program)
    {
        $program->delete();

        return back()->with('success', 'Program deleted.');
    }
}
