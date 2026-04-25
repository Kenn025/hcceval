<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreStudentRequest;
use App\Http\Requests\Admin\UpdateStudentRequest;
use App\Models\Branch;
use App\Models\Department;
use App\Models\EducationLevel;
use App\Models\Program;
use App\Models\Strand;
use App\Models\Student;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StudentController extends Controller
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

        $students = Student::query()
            ->with(['branch:id,name', 'department:id,name', 'program:id,name', 'strand:id,name', 'yearLevel:id,year_level,section,strand_id', 'irregSubject:id,code,name'])
            ->where('is_deleted', 0)
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

        return Inertia::render('Admin/Students', [
            'students'    => $students,
            'filters'     => [
                'search' => $search,
                'branch_id' => $branchId,
                'department_id' => $departmentId,
                'program_id' => $programId,
            ],
            'branches'    => $branches,
            'departments' => Department::query()
                ->select('id', 'name', 'code', 'branch_id', 'is_activated')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->when($scopedId, fn ($q) => $q->where('branch_id', $scopedId))
                ->orderBy('name')
                ->get(),
            'programs'    => Program::query()
                ->select('id', 'name', 'department_id')
                ->where('is_deleted', 0)
                ->when($scopedId, fn ($q) => $q->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
                ->orderBy('name')
                ->get(),
            'strands'     => Strand::query()
                ->select('id', 'name', 'department_id')
                ->where('is_deleted', 0)
                ->when($scopedId, fn ($q) => $q->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
                ->orderBy('name')
                ->get(),
            'yearLevels'  => EducationLevel::query()
                ->select('id', 'department_id', 'program_id', 'strand_id', 'subject_id', 'year_level', 'section')
                ->selectRaw("CONCAT(year_level, ' - ', section) as name")
                ->where('is_deleted', 0)
                ->when($scopedId, fn ($q) => $q->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
                ->orderBy('year_level')
                ->orderBy('section')
                ->get(),
            'subjects' => \App\Models\Subject::query()
                ->select('id', 'code', 'name', 'department_id', 'program_id', 'strand_id', 'type')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->when($scopedId, fn ($q) => $q->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
                ->orderBy('name')
                ->get(),
            'nextStudentCodes' => array_merge(
                ['default' => $this->generateStudentCode()],
                $branches
                    ->mapWithKeys(fn ($branch) => [(string) $branch->id => $this->generateStudentCode((int) $branch->id)])
                    ->all()
            ),
            'isBranchAdmin' => $this->isBranchAdmin(),
            'selectedBranchId' => $branchId ? (int) $branchId : null,
            'scopedBranchId' => $scopedId,
        ]);
    }

    public function store(StoreStudentRequest $request)
    {
        $payload = $this->studentPayloadFromRequest($request);
        Student::create($this->mapStudentPayload($payload));

        return back()->with('success', 'Student created successfully.');
    }

    public function update(UpdateStudentRequest $request, Student $student)
    {
        $payload = $this->studentPayloadFromRequest($request);
        $student->update($this->mapStudentPayload($payload, false));

        return back()->with('success', 'Student updated successfully.');
    }

    public function destroy(Student $student)
    {
        $student->update(['is_deleted' => 1]);

        return back()->with('success', 'Student deleted.');
    }

    protected function mapStudentPayload(array $validated, bool $includeDefaultPassword = true): array
    {
        $status = strtolower((string) ($validated['status'] ?? 'active'));
        $branchId = isset($validated['branch_id']) && $validated['branch_id'] !== '' ? (int) $validated['branch_id'] : null;

        $payload = [
            'code' => $validated['student_no'] ?? $this->generateStudentCode($branchId),
            'branch_id' => $branchId,
            'department_id' => $validated['department_id'] ?? null,
            'program_id' => $validated['program_id'] ?? null,
            'strand_id' => $validated['strand_id'] ?? null,
            'education_level_id' => $validated['year_level_id'] ?? null,
            'subject_id' => array_values(array_map('intval', $validated['subject_ids'] ?? [])),
            'is_irreg' => (bool) ($validated['is_irreg'] ?? false),
            'irreg_subject_id' => !empty($validated['is_irreg']) ? ($validated['irreg_subject_id'] ?? null) : null,
            'firstname' => $validated['first_name'],
            'middlename' => $validated['middle_name'] ?? null,
            'lastname' => $validated['last_name'],
            'email' => $validated['email'],
            'is_activated' => $status === 'active',
            'is_deleted' => 0,
        ];

        if (! empty($validated['password'])) {
            $payload['password'] = md5($validated['password']);
        } elseif ($includeDefaultPassword) {
            $payload['password'] = md5('hcc1234');
        }

        return $payload;
    }

    protected function generateStudentCode(?int $branchId = null): string
    {
        if ($branchId === null) {
            return $this->generateGenericStudentCode();
        }

        $branch = Branch::query()
            ->select('id', 'code')
            ->findOrFail($branchId);

        $branchCode = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $branch->code));
        $prefix = 'STU-' . $branchCode . '-';

        $lastCode = Student::query()
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

    protected function generateGenericStudentCode(): string
    {
        $prefix = 'STU-GEN-';

        $lastCode = Student::query()
            ->where('code', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->value('code');

        $lastNumber = 0;

        if ($lastCode && preg_match('/(\d+)$/', $lastCode, $matches)) {
            $lastNumber = (int) $matches[1];
        }

        return $prefix . str_pad((string) ($lastNumber + 1), 5, '0', STR_PAD_LEFT);
    }

    protected function studentPayloadFromRequest(Request $request): array
    {
        $scopedBranchId = $this->scopedBranchId();
        
        return [
            'student_no' => $request->input('student_no'),
            'branch_id' => $scopedBranchId ?? $request->input('branch_id'),
            'department_id' => $request->input('department_id'),
            'program_id' => $request->input('program_id'),
            'strand_id' => $request->input('strand_id'),
            'year_level_id' => $request->input('year_level_id'),
            'subject_ids' => $request->input('subject_ids', []),
            'is_irreg' => $request->boolean('is_irreg'),
            'irreg_subject_id' => $request->input('irreg_subject_id'),
            'first_name' => $request->input('first_name'),
            'middle_name' => $request->input('middle_name'),
            'last_name' => $request->input('last_name'),
            'suffix_name' => $request->input('suffix_name'),
            'email' => $request->input('email'),
            'password' => $request->input('password'),
            'status' => $request->input('status', 'active'),
        ];
    }
}
