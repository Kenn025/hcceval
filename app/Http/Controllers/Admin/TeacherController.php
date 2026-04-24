<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTeacherRequest;
use App\Http\Requests\Admin\UpdateTeacherRequest;
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

    public function store(StoreTeacherRequest $request)
    {
        Teacher::create($this->mapTeacherPayload($request->validated()));

        return back()->with('success', 'Teacher created successfully.');
    }

    public function update(UpdateTeacherRequest $request, Teacher $teacher)
    {
        $teacher->update($this->mapTeacherPayload($request->validated(), false));

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
