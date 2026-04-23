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
            ->when($search, fn ($q) => $q->where('admin_name', 'like', "%{$search}%")
                ->orWhere('admin_email', 'like', "%{$search}%"))
            ->orderBy('admin_name')
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
            'admin_name'     => 'required|string|max:150',
            'admin_email'    => 'required|email|max:150|unique:admins,admin_email',
            'admin_password' => 'required|string|min:6',
            'role'           => 'required|in:superadmin,overalladmin,admin',
            'branch_id'      => 'nullable|exists:branches,id',
        ]);

        if ($validated['role'] === 'admin' && empty($validated['branch_id'])) {
            return back()->withErrors(['branch_id' => 'Branch is required for a branch admin.']);
        }

        $validated['admin_password'] = md5($validated['admin_password']);

        Admin::create($validated);

        return back()->with('success', 'Admin user created successfully.');
    }

    public function update(Request $request, Admin $admin)
    {
        $pk = $admin->getKey();

        $validated = $request->validate([
            'admin_name'     => 'required|string|max:150',
            'admin_email'    => "required|email|max:150|unique:admins,admin_email,{$pk},admin_id",
            'admin_password' => 'nullable|string|min:6',
            'role'           => 'required|in:superadmin,overalladmin,admin',
            'branch_id'      => 'nullable|exists:branches,id',
        ]);

        if ($validated['role'] === 'admin' && empty($validated['branch_id'])) {
            return back()->withErrors(['branch_id' => 'Branch is required for a branch admin.']);
        }

        if (! empty($validated['admin_password'])) {
            $validated['admin_password'] = md5($validated['admin_password']);
        } else {
            unset($validated['admin_password']);
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
