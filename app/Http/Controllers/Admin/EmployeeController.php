<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Program;
use App\Models\Strand;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $search   = $request->input('search', '');
        $scopedId = $this->scopedBranchId();
        $branchId = $scopedId ?? $request->input('branch_id');

        $employees = Employee::query()
            ->with(['branch:id,name', 'department:id,name', 'program:id,name'])
            ->where('is_deleted', 0)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('firstname', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Employees', [
            'employees'     => $employees,
            'filters'       => ['search' => $search, 'branch_id' => $branchId],
            'branches'      => $scopedId ? [] : Branch::query()
                ->select('id', 'name')
                ->where('is_deleted', 0)
                ->where('code', '!=', 'OVERALL')
                ->orderBy('name')
                ->get(),
            'departments'   => Department::select('id', 'name')->orderBy('name')->get(),
            'programs'      => Program::select('id', 'name')->orderBy('name')->get(),
            'strands'       => Strand::select('id', 'name')->orderBy('name')->get(),
            'isBranchAdmin' => $this->isBranchAdmin(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_no' => 'required|string|max:50|unique:employee,code',
            'branch_id' => 'required|exists:branch,id',
            'department_id' => 'nullable|exists:department,id',
            'program_id' => 'nullable|exists:program,id',
            'strand_id' => 'nullable|exists:strand,id',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'suffix_name' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150|unique:employee,email',
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|string|max:100',
        ]);

        Employee::create($this->mapEmployeePayload($validated));

        return back()->with('success', 'Employee created successfully.');
    }

    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'employee_no' => "required|string|max:50|unique:employee,code,{$employee->id}",
            'branch_id' => 'required|exists:branch,id',
            'department_id' => 'nullable|exists:department,id',
            'program_id' => 'nullable|exists:program,id',
            'strand_id' => 'nullable|exists:strand,id',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'suffix_name' => 'nullable|string|max:50',
            'email' => "nullable|email|max:150|unique:employee,email,{$employee->id}",
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|string|max:100',
        ]);

        $employee->update($this->mapEmployeePayload($validated, false));

        return back()->with('success', 'Employee updated successfully.');
    }

    public function destroy(Employee $employee)
    {
        $employee->update(['is_deleted' => 1]);

        return back()->with('success', 'Employee deleted.');
    }

    protected function mapEmployeePayload(array $validated, bool $includeDefaultPassword = true): array
    {
        $payload = [
            'code' => $validated['employee_no'],
            'branch_id' => $validated['branch_id'],
            'department_id' => $validated['department_id'] ?: null,
            'program_id' => $validated['program_id'] ?: null,
            'strand_id' => $validated['strand_id'] ?: null,
            'firstname' => $validated['first_name'],
            'middlename' => $validated['middle_name'] ?: null,
            'lastname' => $validated['last_name'],
            'email' => $validated['email'] ?: null,
            'role' => $validated['role'] ?: null,
            'is_activated' => true,
            'is_deleted' => 0,
        ];

        if (! empty($validated['password'])) {
            $payload['password'] = md5($validated['password']);
        } elseif ($includeDefaultPassword) {
            $payload['password'] = md5('hcc1234');
        }

        return $payload;
    }
}
