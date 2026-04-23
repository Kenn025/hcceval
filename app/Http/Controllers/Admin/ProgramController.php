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
            ->with(['department:id,name'])
            ->where('is_deleted', 0)
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Programs', [
            'programs' => $programs,
            'filters' => ['search' => $search],
            'departments' => Department::query()
                ->select('id', 'name')
                ->where('is_deleted', 0)
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:department,id',
            'name' => 'required|string|max:150',
            'duration_years' => 'required|integer|min:1',
            'is_activated' => 'boolean',
        ]);

        Program::create($validated);

        return back()->with('success', 'Program created successfully.');
    }

    public function update(Request $request, Program $program)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:department,id',
            'name' => 'required|string|max:150',
            'duration_years' => 'required|integer|min:1',
            'is_activated' => 'boolean',
        ]);

        $program->update($validated);

        return back()->with('success', 'Program updated successfully.');
    }

    public function destroy(Program $program)
    {
        $program->update(['is_deleted' => 1]);

        return back()->with('success', 'Program deleted.');
    }
}
