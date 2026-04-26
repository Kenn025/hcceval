<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search', '');
        $editId = $request->input('edit_id');
        $createBranchId = $request->input('create_branch_id');

        $perPage = $request->integer('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100]) ? $perPage : 15;

        $admins = Admin::query()
            ->with(['branch:id,name'])
            ->where('is_deleted', 0)
            ->where('role', '!=', 'superadmin')
            ->when($search, function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        $branches = Branch::query()
            ->select('id', 'name', 'code')
            ->where('is_deleted', 0)
            ->orderBy('name')
            ->get()
            ->map(fn (Branch $branch) => [
                'id' => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
                'next_admin_code' => $this->generateAdminCode('admin', $branch->id),
            ]);

        return Inertia::render('Admin/AdminUsers', [
            'admins'   => $admins,
            'filters'  => [
                'search' => $search,
                'edit_id' => $editId,
                'create_branch_id' => $createBranchId,
                'per_page' => $perPage,
            ],
            'branches' => $branches,
            'nextOverallAdminCode' => $this->generateAdminCode('overalladmin', 1),
        ]);
    }

    public function checkEmailAvailability(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|max:150',
            'admin_id' => 'nullable|integer',
        ]);

        $message = $this->emailInUseMessage($validated['email'], $validated['admin_id'] ?? null);

        return response()->json([
            'available' => $message === null,
            'message' => $message,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|email|max:150|unique:admin,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:overalladmin,admin',
            'branch_id' => 'nullable|exists:branch,id',
            'is_activated' => 'boolean',
        ]);

        if ($message = $this->emailInUseMessage($validated['email'])) {
            return back()->withErrors(['email' => $message])->withInput();
        }

        if ($validated['role'] === 'admin' && empty($validated['branch_id'])) {
            return back()->withErrors(['branch_id' => 'Branch is required for a branch admin.']);
        }

        if ($validated['role'] !== 'admin') {
            $validated['branch_id'] = 1;
        }

        Admin::create([
            'code' => $this->generateAdminCode($validated['role'], $validated['branch_id'] ?? null),
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => \App\Services\LegacyHash::make($validated['password']),
            'role' => $validated['role'],
            'branch_id' => $validated['branch_id'] ?? null,
            'is_activated' => array_key_exists('is_activated', $validated) ? (bool) $validated['is_activated'] : true,
            'is_deleted' => 0,
        ]);

        return back()->with('success', 'Admin user created successfully.');
    }

    public function update(Request $request, Admin $admin)
    {
        $pk = $admin->getKey();

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => "required|email|max:150|unique:admin,email,{$pk},id",
            'password' => 'nullable|string|min:6',
            'role' => 'required|in:overalladmin,admin',
            'branch_id' => 'nullable|exists:branch,id',
            'is_activated' => 'boolean',
        ]);

        if ($message = $this->emailInUseMessage($validated['email'], $admin->id)) {
            return back()->withErrors(['email' => $message])->withInput();
        }

        if ($validated['role'] === 'admin' && empty($validated['branch_id'])) {
            return back()->withErrors(['branch_id' => 'Branch is required for a branch admin.']);
        }

        if ($validated['role'] !== 'admin') {
            $validated['branch_id'] = 1;
        }

        if (! empty($validated['password'])) {
            $validated['password'] = \App\Services\LegacyHash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $admin->update([
            ...$validated,
            'code' => $this->generateAdminCode($validated['role'], $validated['branch_id'] ?? null, $admin->id),
            'is_activated' => array_key_exists('is_activated', $validated) ? (bool) $validated['is_activated'] : $admin->is_activated,
        ]);

        return back()->with('success', 'Admin user updated successfully.');
    }

    public function destroy(Admin $admin)
    {
        $admin->update(['is_deleted' => 1]);

        return back()->with('success', 'Admin user deleted.');
    }

    private function generateAdminCode(string $role, ?int $branchId = null, ?int $ignoreId = null): string
    {
        if ($role === 'overalladmin') {
            $base = 'OVERALLADMIN';
            $sequence = 1;

            do {
                $candidate = $base . str_pad((string) $sequence, 2, '0', STR_PAD_LEFT);
                $exists = Admin::query()
                    ->where('code', $candidate)
                    ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                    ->exists();
                $sequence++;
            } while ($exists);

            return $candidate;
        }

        $branch = Branch::query()->find($branchId);
        $branchCode = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) ($branch?->code ?: 'BR')));
        $base = 'ADMIN-' . $branchCode;
        $candidate = $base;
        $suffix = 2;

        while (
            Admin::query()
                ->where('code', $candidate)
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $candidate = $base . '-' . $suffix;
            $suffix++;
        }

        return Str::substr($candidate, 0, 50);
    }

    private function emailInUseMessage(string $email, ?int $ignoreAdminId = null): ?string
    {
        $normalizedEmail = strtolower(trim($email));
        $checks = [
            ['table' => 'admin', 'label' => 'an admin account', 'ignore_id' => $ignoreAdminId],
            ['table' => 'teacher', 'label' => 'a teacher account', 'ignore_id' => null],
            ['table' => 'student', 'label' => 'a student account', 'ignore_id' => null],
            ['table' => 'employee', 'label' => 'an employee account', 'ignore_id' => null],
        ];

        foreach ($checks as $check) {
            $exists = DB::table($check['table'])
                ->whereRaw('LOWER(email) = ?', [$normalizedEmail])
                ->when($check['ignore_id'], fn ($query, $id) => $query->where('id', '!=', $id))
                ->exists();

            if ($exists) {
                return "This email is already used by {$check['label']}.";
            }
        }

        return null;
    }
}
