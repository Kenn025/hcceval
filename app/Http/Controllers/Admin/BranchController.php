<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BranchController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search', '');

        $branches = Branch::query()
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%"))
            ->withCount('departments')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Branches', [
            'branches' => $branches,
            'filters' => ['search' => $search],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:branches,code',
            'name' => 'required|string|max:150',
            'highest_department' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'is_main' => 'boolean',
            'is_active' => 'boolean',
        ]);

        Branch::create($validated);

        return back()->with('success', 'Branch created successfully.');
    }

    public function update(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'code' => "required|string|max:50|unique:branches,code,{$branch->id}",
            'name' => 'required|string|max:150',
            'highest_department' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'is_main' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $branch->update($validated);

        return back()->with('success', 'Branch updated successfully.');
    }

    public function destroy(Branch $branch)
    {
        $branch->delete();

        return back()->with('success', 'Branch deleted.');
    }
}
