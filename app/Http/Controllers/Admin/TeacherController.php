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
        $departmentId = $request->input('department_id');
        $programId = $request->input('program_id');
        $branches = Branch::query()
            ->select('id', 'name', 'code')
            ->where('is_deleted', 0)
            ->where('code', '!=', 'OVERALL')
            ->when($scopedId, fn ($query) => $query->where('id', $scopedId))
            ->orderBy('name')
            ->get();

        $teachers = Teacher::query()
            ->with(['branch:id,name', 'department:id,name', 'program:id,name'])
            ->where('is_deleted', 0)
            ->when($this->isBranchAdmin(), fn ($q) => $q->where('role', 'Program Chair'))
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
            ->when($programId, fn ($q) => $q->where('program_id', $programId))
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
            'filters'       => [
                'search' => $search, 
                'branch_id' => $branchId,
                'department_id' => $departmentId,
                'program_id' => $programId,
            ],
            'branches'      => $branches,
            'departments'   => Department::query()
                ->select('id', 'name', 'code', 'branch_id', 'is_activated')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->when($scopedId, fn ($q) => $q->where('branch_id', $scopedId))
                ->orderBy('name')
                ->get(),
            'programs'      => Program::query()
                ->select('id', 'name', 'department_id')
                ->where('is_deleted', 0)
                ->when($scopedId, fn ($q) => $q->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
                ->orderBy('name')
                ->get(),
            'strands'       => Strand::query()
                ->select('id', 'name', 'department_id')
                ->where('is_deleted', 0)
                ->when($scopedId, fn ($q) => $q->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
                ->orderBy('name')
                ->get(),
            'nextTeacherCodes' => array_merge(
                ['default' => $this->generateTeacherCode()],
                $branches
                    ->mapWithKeys(fn ($branch) => [(string) $branch->id => $this->generateTeacherCode((int) $branch->id)])
                    ->all()
            ),
            'isBranchAdmin' => $this->isBranchAdmin(),
            'selectedBranchId' => $branchId ? (int) $branchId : null,
            'scopedBranchId' => $scopedId,
        ]);
    }

    public function store(Request $request)
    {
        $payload = $this->teacherPayloadFromRequest($request);
        Teacher::create($this->mapTeacherPayload($payload));

        return back()->with('success', 'Teacher created successfully.');
    }

    public function update(Request $request, Teacher $teacher)
    {
        $payload = $this->teacherPayloadFromRequest($request);
        $teacher->update($this->mapTeacherPayload($payload, false));

        return back()->with('success', 'Teacher updated successfully.');
    }

    public function destroy(Teacher $teacher)
    {
        $teacher->update(['is_deleted' => 1]);

        return back()->with('success', 'Teacher deleted.');
    }

    protected function mapTeacherPayload(array $validated, bool $includeDefaultPassword = true): array
    {
        $branchId = $validated['branch_id'] ?: null;

        $payload = [
            'code' => $validated['employee_no'] ?: $this->generateTeacherCode($branchId ? (int) $branchId : null),
            'branch_id' => $branchId,
            'department_id' => $validated['department_id'] ?: null,
            'program_id' => $validated['program_id'] ?: null,
            'strand_id' => $validated['strand_id'] ?: null,
            'firstname' => $validated['first_name'] ?: null,
            'middlename' => $validated['middle_name'] ?: null,
            'lastname' => $validated['last_name'] ?: null,
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

    protected function generateTeacherCode(?int $branchId = null): string
    {
        if ($branchId === null) {
            return $this->generateGenericTeacherCode();
        }

        $branch = Branch::query()
            ->select('id', 'code')
            ->findOrFail($branchId);

        $branchCode = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $branch->code));
        $prefix = 'TCH-' . $branchCode . '-';

        $lastCode = Teacher::query()
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

    protected function generateGenericTeacherCode(): string
    {
        $prefix = 'TCH-GEN-';

        $lastCode = Teacher::query()
            ->where('code', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->value('code');

        $lastNumber = 0;

        if ($lastCode && preg_match('/(\d+)$/', $lastCode, $matches)) {
            $lastNumber = (int) $matches[1];
        }

        return $prefix . str_pad((string) ($lastNumber + 1), 5, '0', STR_PAD_LEFT);
    }

    protected function teacherPayloadFromRequest(Request $request): array
    {
        $scopedBranchId = $this->scopedBranchId();

        return [
            'employee_no' => $request->input('employee_no'),
            'branch_id' => $scopedBranchId ?? $request->input('branch_id'),
            'department_id' => $request->input('department_id'),
            'program_id' => $request->input('program_id'),
            'strand_id' => $request->input('strand_id'),
            'first_name' => $request->input('first_name'),
            'middle_name' => $request->input('middle_name'),
            'last_name' => $request->input('last_name'),
            'suffix_name' => $request->input('suffix_name'),
            'email' => $request->input('email'),
            'password' => $request->input('password'),
            'role' => $request->input('role', 'Teacher'),
        ];
    }
}
