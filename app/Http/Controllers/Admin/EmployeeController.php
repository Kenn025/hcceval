<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeDepartment;
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
        $branches = Branch::query()
            ->select('id', 'name', 'code')
            ->where('is_deleted', 0)
            ->where('code', '!=', 'OVERALL')
            ->when($scopedId, fn ($query) => $query->where('id', $scopedId))
            ->orderBy('name')
            ->get();

        $employees = Employee::query()
            ->with(['branch:id,name', 'department:id,name', 'employeeDepartment:id,name', 'program:id,name'])
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
            'branches'      => $branches,
            'departments'   => Department::select('id', 'name')->orderBy('name')->get(),
            'employeeDepartments' => EmployeeDepartment::query()
                ->select('id', 'branch_id', 'code', 'name')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->when($scopedId, fn ($query) => $query->where(fn ($sub) => $sub
                    ->whereNull('branch_id')
                    ->orWhere('branch_id', $scopedId)))
                ->orderBy('name')
                ->get(),
            'programs'      => Program::select('id', 'name')->orderBy('name')->get(),
            'strands'       => Strand::select('id', 'name')->orderBy('name')->get(),
            'nextEmployeeCodes' => array_merge(
                ['default' => $this->generateEmployeeCode()],
                $branches
                    ->mapWithKeys(fn ($branch) => [(string) $branch->id => $this->generateEmployeeCode((int) $branch->id)])
                    ->all()
            ),
            'isBranchAdmin' => $this->isBranchAdmin(),
            'selectedBranchId' => $branchId ? (int) $branchId : null,
            'scopedBranchId' => $scopedId,
        ]);
    }

    public function store(\App\Http\Requests\Admin\StoreEmployeeRequest $request)
    {
        $payload = $this->employeePayloadFromRequest($request);
        Employee::create($this->mapEmployeePayload($payload));

        return back()->with('success', 'Employee created successfully.');
    }

    public function update(\App\Http\Requests\Admin\UpdateEmployeeRequest $request, Employee $employee)
    {
        $payload = $this->employeePayloadFromRequest($request);
        $employee->update($this->mapEmployeePayload($payload, false));

        return back()->with('success', 'Employee updated successfully.');
    }

    public function destroy(Employee $employee)
    {
        $employee->update(['is_deleted' => 1]);

        return back()->with('success', 'Employee deleted.');
    }

    protected function mapEmployeePayload(array $validated, bool $includeDefaultPassword = true): array
    {
        $branchId = $validated['branch_id'] ?: null;

        $payload = [
            'code' => $validated['employee_no'] ?: $this->generateEmployeeCode($branchId ? (int) $branchId : null),
            'branch_id' => $branchId,
            'department_id' => $validated['department_id'] ?: null,
            'employee_department_id' => $validated['employee_department_id'] ?: null,
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

    protected function employeePayloadFromRequest(Request $request): array
    {
        $scopedBranchId = $this->scopedBranchId();

        return [
            'employee_no' => $request->input('employee_no'),
            'branch_id' => $scopedBranchId ?? $request->input('branch_id'),
            'department_id' => $request->input('department_id'),
            'employee_department_id' => $request->input('employee_department_id'),
            'program_id' => $request->input('program_id'),
            'strand_id' => $request->input('strand_id'),
            'first_name' => $request->input('first_name'),
            'middle_name' => $request->input('middle_name'),
            'last_name' => $request->input('last_name'),
            'suffix_name' => $request->input('suffix_name'),
            'email' => $request->input('email'),
            'password' => $request->input('password'),
            'role' => $request->input('role', 'Employee'),
        ];
    }

    protected function generateEmployeeCode(?int $branchId = null): string
    {
        if ($branchId === null) {
            return $this->generateGenericEmployeeCode();
        }

        $branch = Branch::query()
            ->select('id', 'code')
            ->findOrFail($branchId);

        $branchCode = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $branch->code));
        $prefix = 'EMP-' . $branchCode . '-';

        $lastCode = Employee::query()
            ->where('branch_id', $branchId)
            ->where('code', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->value('code');

        $lastNumber = 0;

        if ($lastCode && preg_match('/(\d+)$/', $lastCode, $matches)) {
            $lastNumber = (int) $matches[1];
        }

        return $prefix . str_pad((string) ($lastNumber + 1), 5, '0', STR_PAD_LEFT);
    }

    protected function generateGenericEmployeeCode(): string
    {
        $prefix = 'EMP-GEN-';

        $lastCode = Employee::query()
            ->where('code', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->value('code');

        $lastNumber = 0;

        if ($lastCode && preg_match('/(\d+)$/', $lastCode, $matches)) {
            $lastNumber = (int) $matches[1];
        }

        return $prefix . str_pad((string) ($lastNumber + 1), 5, '0', STR_PAD_LEFT);
    }
}
