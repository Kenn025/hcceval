<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Branch;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class BranchController extends Controller
{
    private const DEPARTMENT_LEVELS = ['elementary', 'junior_high', 'senior_high', 'college'];

    public function index(Request $request)
    {
        $search = $request->input('search', '');
        $perPage = $request->integer('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100]) ? $perPage : 15;

        $branches = Branch::query()
            ->where('is_deleted', 0)
            ->where('code', '!=', 'OVERALL')
            ->when($search, function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->withCount('departments')
            ->with(['departments' => fn ($query) => $query
                ->select('id', 'branch_id', 'code', 'name', 'is_activated')
                ->where('is_deleted', 0)
                ->orderBy('id')])
            ->with(['admins' => fn ($query) => $query
                ->select('id', 'branch_id', 'code', 'name', 'email', 'role', 'is_activated')
                ->where('is_deleted', 0)
                ->orderBy('name')])
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Admin/Branches', [
            'branches' => $branches,
            'filters' => ['search' => $search, 'per_page' => $perPage],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'address' => 'nullable|string',
            'is_main' => 'boolean',
            'is_active' => 'boolean',
            'department_levels' => 'required|array|min:1',
            'department_levels.*' => 'in:elementary,junior_high,senior_high,college',
            'admin_email' => 'nullable|email|max:150',
            'admin_password' => 'nullable|string|min:6|max:100',
        ]);

        DB::transaction(function () use ($validated) {
            $branchCode = $this->generateUniqueBranchCode($validated['name']);
            $departmentLevels = $validated['department_levels'];
            $highestDepartment = $this->resolveHighestDepartment($departmentLevels);
            $adminEmail = $this->generateUniqueAdminEmail($validated['name'], $validated['admin_email'] ?? null);
            $adminPassword = $validated['admin_password'] ?? $this->generatePassword();

            $branch = Branch::create([
                'code' => $branchCode,
                'name' => $validated['name'],
                'highest_department' => $highestDepartment,
                'custom_settings' => json_encode([
                    'department_levels' => $departmentLevels,
                    'generated_admin_email' => $adminEmail,
                ]),
                'address' => $validated['address'] ?? null,
                'is_main' => ! empty($validated['is_main']),
                'is_activated' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : true,
                'is_deleted' => 0,
            ]);

            foreach (self::DEPARTMENT_LEVELS as $level) {
                Department::create([
                    'code' => $this->generateUniqueDepartmentCode($branch->code, $level),
                    'name' => $this->departmentLabel($level),
                    'branch_id' => $branch->id,
                    'is_activated' => in_array($level, $departmentLevels, true),
                    'is_deleted' => 0,
                ]);
            }

            Admin::create([
                'code' => $this->generateUniqueAdminCode($branch->code),
                'name' => 'Admin ' . $branch->name,
                'role' => 'admin',
                'branch_id' => $branch->id,
                'email' => $adminEmail,
                'password' => \App\Services\LegacyHash::make($adminPassword),
                'is_activated' => true,
                'is_deleted' => 0,
            ]);
        });

        return back()->with('success', 'Branch created successfully.');
    }

    public function update(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'code' => "required|string|max:50|unique:branch,code,{$branch->id},id",
            'name' => 'required|string|max:150',
            'department_levels' => 'required|array|min:1',
            'department_levels.*' => 'in:elementary,junior_high,senior_high,college',
            'address' => 'nullable|string',
        ]);

        DB::transaction(function () use ($branch, $validated) {
            $departmentLevels = $validated['department_levels'];

            $branch->update([
                'code' => $validated['code'],
                'name' => $validated['name'],
                'highest_department' => $this->resolveHighestDepartment($departmentLevels),
                'address' => $validated['address'] ?? null,
            ]);

            foreach (self::DEPARTMENT_LEVELS as $level) {
                $department = Department::query()
                    ->where('branch_id', $branch->id)
                    ->where(function ($query) use ($level) {
                        $query->where('code', 'like', '%' . $this->departmentSuffix($level))
                            ->orWhere('name', $this->departmentLabel($level));
                    })
                    ->first();

                if ($department) {
                    $department->update([
                        'is_activated' => in_array($level, $departmentLevels, true),
                    ]);
                }
            }
        });

        return back()->with('success', 'Branch updated successfully.');
    }

    public function destroy(Branch $branch)
    {
        $branch->update(['is_deleted' => 1]);

        return back()->with('success', 'Branch deleted.');
    }

    public function unlinkAdmin(Branch $branch, Admin $admin)
    {
        abort_unless((int) $admin->branch_id === (int) $branch->id, 404);

        $admin->update([
            'is_deleted' => 1,
        ]);

        return back()->with('success', 'Admin account unlinked successfully.');
    }

    private function resolveHighestDepartment(array $departmentLevels): ?string
    {
        $priority = ['elementary', 'junior_high', 'senior_high', 'college'];
        $selected = array_values(array_intersect($priority, $departmentLevels));

        return empty($selected) ? null : end($selected);
    }

    private function departmentLabel(string $departmentLevel): string
    {
        return match ($departmentLevel) {
            'elementary' => 'Elementary Department',
            'junior_high' => 'Junior High Department',
            'senior_high' => 'Senior High Department',
            default => 'College Department',
        };
    }

    private function departmentSuffix(string $departmentLevel): string
    {
        return match ($departmentLevel) {
            'elementary' => 'ELEM',
            'junior_high' => 'JHS',
            'senior_high' => 'SHS',
            default => 'COL',
        };
    }

    private function generateUniqueDepartmentCode(string $branchCode, string $departmentLevel): string
    {
        $base = 'DEP-' . strtoupper($branchCode) . '-' . $this->departmentSuffix($departmentLevel);
        $candidate = $base;
        $suffix = 2;

        while (Department::query()->where('code', $candidate)->exists()) {
            $candidate = $base . '-' . $suffix;
            $suffix++;
        }

        return $candidate;
    }

    private function generateUniqueBranchCode(string $name): string
    {
        $base = $this->makeBranchCodeBase($name);
        $candidate = $base;
        $suffix = 2;

        while (Branch::query()->where('code', $candidate)->exists()) {
            $candidate = $base . '-' . $suffix;
            $suffix++;
        }

        return $candidate;
    }

    private function makeBranchCodeBase(string $name): string
    {
        $words = preg_split('/\s+/', strtoupper(trim($name))) ?: [];
        $ignore = ['AND', 'OF', 'THE', 'CAMPUS', 'NUEVA', 'ECIJA'];
        $filtered = array_values(array_filter($words, fn ($word) => $word !== '' && ! in_array($word, $ignore, true)));

        $initials = collect($filtered)
            ->map(fn ($word) => preg_replace('/[^A-Z0-9]/', '', $word))
            ->filter()
            ->map(fn ($word) => Str::substr($word, 0, 1))
            ->implode('');

        if ($initials !== '') {
            return Str::substr($initials, 0, 12);
        }

        $fallback = preg_replace('/[^A-Z0-9]/', '', strtoupper($name)) ?: 'BRANCH';

        return Str::substr($fallback, 0, 12);
    }

    private function generateUniqueAdminEmail(string $branchName, ?string $preferredEmail = null): string
    {
        $base = $preferredEmail
            ? Str::before(strtolower($preferredEmail), '@')
            : 'admin.' . Str::of($branchName)->lower()->replaceMatches('/[^a-z0-9]+/', '.')->trim('.')->value();
        $base = trim($base, '.') ?: 'admin.branch';
        $candidate = $base . '@hcc.local';
        $suffix = 2;

        while (Admin::query()->where('email', $candidate)->exists()) {
            $candidate = $base . $suffix . '@hcc.local';
            $suffix++;
        }

        return $candidate;
    }

    private function generateUniqueAdminCode(string $branchCode): string
    {
        $base = 'ADMIN-' . strtoupper($branchCode);
        $candidate = $base;
        $suffix = 2;

        while (Admin::query()->where('code', $candidate)->exists()) {
            $candidate = $base . '-' . $suffix;
            $suffix++;
        }

        return $candidate;
    }

    private function generatePassword(): string
    {
        return 'HCC' . strtoupper(Str::random(8));
    }
}
