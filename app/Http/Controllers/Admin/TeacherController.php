<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Program;
use App\Models\Strand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $search   = $request->input('search', '');
        $scopedId = $this->scopedBranchId();
        $branchId = $scopedId ?? $request->input('branch_id');

        $teachers = Employee::query()
            ->with(['branch:id,name', 'department:id,name', 'program:id,name'])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('employee_no', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->orderBy('last_name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Teachers', [
            'teachers'      => $teachers,
            'filters'       => ['search' => $search, 'branch_id' => $branchId],
            'branches'      => $scopedId ? [] : Branch::select('id', 'name')->orderBy('name')->get(),
            'departments'   => Department::select('id', 'name')->orderBy('name')->get(),
            'programs'      => Program::select('id', 'name')->orderBy('name')->get(),
            'strands'       => Strand::select('id', 'name')->orderBy('name')->get(),
            'isBranchAdmin' => $this->isBranchAdmin(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_no' => 'required|string|max:50|unique:employees,employee_no',
            'branch_id' => 'required|exists:branches,id',
            'department_id' => 'nullable|exists:departments,id',
            'program_id' => 'nullable|exists:programs,id',
            'strand_id' => 'nullable|exists:strands,id',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'suffix_name' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150|unique:employees,email',
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|string|max:100',
        ]);

        $validated['password'] = Hash::make($validated['password'] ?? 'hcc1234');

        Employee::create($validated);

        return back()->with('success', 'Teacher created successfully.');
    }

    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'employee_no' => "required|string|max:50|unique:employees,employee_no,{$employee->id}",
            'branch_id' => 'required|exists:branches,id',
            'department_id' => 'nullable|exists:departments,id',
            'program_id' => 'nullable|exists:programs,id',
            'strand_id' => 'nullable|exists:strands,id',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'suffix_name' => 'nullable|string|max:50',
            'email' => "nullable|email|max:150|unique:employees,email,{$employee->id}",
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|string|max:100',
        ]);

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $employee->update($validated);

        return back()->with('success', 'Teacher updated successfully.');
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();

        return back()->with('success', 'Teacher deleted.');
    }
}
