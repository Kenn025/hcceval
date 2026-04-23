<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Strand;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StrandController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search', '');

        $strands = Strand::query()
            ->with(['department:id,name,code'])
            ->where('is_deleted', 0)
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Strands', [
            'strands' => $strands,
            'filters' => ['search' => $search],
            'departments' => Department::select('id', 'name', 'code')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'code' => 'required|string|max:50|unique:strands,code',
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'duration_years' => 'nullable|integer|min:1',
            'is_active' => 'boolean',
        ]);

        Strand::create($validated);

        return back()->with('success', 'Strand created successfully.');
    }

    public function update(Request $request, Strand $strand)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'code' => "required|string|max:50|unique:strands,code,{$strand->id}",
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'duration_years' => 'nullable|integer|min:1',
            'is_active' => 'boolean',
        ]);

        $strand->update($validated);

        return back()->with('success', 'Strand updated successfully.');
    }

    public function destroy(Strand $strand)
    {
        $strand->update(['is_deleted' => 1]);

        return back()->with('success', 'Strand deleted.');
    }
}
