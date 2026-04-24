<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Program;
use App\Models\Strand;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $search   = $request->input('search', '');
        $scopedId = $this->scopedBranchId();
        $branchId = $scopedId ?? $request->input('branch_id');

        $teachers = Teacher::query()
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

        return Inertia::render('Admin/Teachers', [
            'teachers'      => $teachers,
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
            'employee_no' => 'required|string|max:50|unique:teacher,code',
            'branch_id' => 'required|exists:branch,id',
            'department_id' => 'nullable|exists:department,id',
            'program_id' => 'nullable|exists:program,id',
            'strand_id' => 'nullable|exists:strand,id',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'suffix_name' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150|unique:teacher,email',
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|string|max:100',
        ]);

        Teacher::create($this->mapTeacherPayload($validated));

        return back()->with('success', 'Teacher created successfully.');
    }

    public function update(Request $request, Teacher $teacher)
    {
        $validated = $request->validate([
            'employee_no' => "required|string|max:50|unique:teacher,code,{$teacher->id}",
            'branch_id' => 'required|exists:branch,id',
            'department_id' => 'nullable|exists:department,id',
            'program_id' => 'nullable|exists:program,id',
            'strand_id' => 'nullable|exists:strand,id',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'suffix_name' => 'nullable|string|max:50',
            'email' => "nullable|email|max:150|unique:teacher,email,{$teacher->id}",
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|string|max:100',
        ]);

        $teacher->update($this->mapTeacherPayload($validated, false));

        return back()->with('success', 'Teacher updated successfully.');
    }

    public function destroy(Teacher $teacher)
    {
        $teacher->update(['is_deleted' => 1]);

        return back()->with('success', 'Teacher deleted.');
    }

    protected function mapTeacherPayload(array $validated, bool $includeDefaultPassword = true): array
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
