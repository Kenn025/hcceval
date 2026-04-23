<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search', '');

        $admins = Admin::query()
            ->with(['branch:id,name'])
            ->where('is_deleted', 0)
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/AdminUsers', [
            'admins'   => $admins,
            'filters'  => ['search' => $search],
            'branches' => Branch::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|email|max:150|unique:admin,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:superadmin,overalladmin,admin',
            'branch_id' => 'nullable|exists:branch,id',
        ]);

        if ($validated['role'] === 'admin' && empty($validated['branch_id'])) {
            return back()->withErrors(['branch_id' => 'Branch is required for a branch admin.']);
        }

        $validated['password'] = md5($validated['password']);

        Admin::create($validated);

        return back()->with('success', 'Admin user created successfully.');
    }

    public function update(Request $request, Admin $admin)
    {
        $pk = $admin->getKey();

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => "required|email|max:150|unique:admin,email,{$pk},id",
            'password' => 'nullable|string|min:6',
            'role' => 'required|in:superadmin,overalladmin,admin',
            'branch_id' => 'nullable|exists:branch,id',
        ]);

        if ($validated['role'] === 'admin' && empty($validated['branch_id'])) {
            return back()->withErrors(['branch_id' => 'Branch is required for a branch admin.']);
        }

        if (! empty($validated['password'])) {
            $validated['password'] = md5($validated['password']);
        } else {
            unset($validated['password']);
        }

        $admin->update($validated);

        return back()->with('success', 'Admin user updated successfully.');
    }

    public function destroy(Admin $admin)
    {
        $admin->update(['is_deleted' => 1]);
        $admin->delete();

        return back()->with('success', 'Admin user deleted.');
    }
}
