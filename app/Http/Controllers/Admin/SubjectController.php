<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Program;
use App\Models\Strand;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SubjectController extends Controller
{
    public function index(Request $request, string $educationType = 'college')
    {
        $search = $request->input('search', '');
        $scopedId = $this->scopedBranchId();
        $requestedBranchId = $request->integer('branch_id');
        $programId = $request->integer('program_id');
        $strandId = $request->integer('strand_id');
        $isGenEd = $request->input('is_gened');

        $typeMap = [
            'college' => 'college',
            'senior-high' => 'shs',
            'junior-high' => 'jhs',
            'grade-school' => 'elementary',
        ];

        $subjectType = $typeMap[$educationType] ?? 'college';
        $departmentFilter = match ($subjectType) {
            'college' => fn ($query) => $query->where('name', 'like', '%College%')->orWhere('code', 'like', '%COL%'),
            'shs' => fn ($query) => $query->where('name', 'like', '%Senior High%')->orWhere('code', 'like', '%SHS%'),
            'jhs' => fn ($query) => $query->where('name', 'like', '%Junior High%')->orWhere('code', 'like', '%JHS%'),
            default => fn ($query) => $query->where('name', 'like', '%Elementary%')->orWhere('code', 'like', '%ELEM%'),
        };

        $branches = Branch::query()
            ->select('id', 'name', 'code')
            ->where('is_deleted', 0)
            ->where('code', '!=', 'OVERALL')
            ->whereHas('departments', function ($query) use ($departmentFilter) {
                $query->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->where(function ($departmentQuery) use ($departmentFilter) {
                        $departmentFilter($departmentQuery);
                    });
            })
            ->when($scopedId, fn ($q) => $q->where('id', $scopedId))
            ->orderBy('name')
            ->get();

        $selectedBranchId = $scopedId
            ?? ($branches->contains('id', $requestedBranchId) ? $requestedBranchId : $branches->first()?->id);

        $subjects = Subject::query()
            ->with(['department:id,name,branch_id', 'department.branch:id,name', 'program:id,name', 'strand:id,name'])
            ->where('is_deleted', 0)
            ->where('type', $subjectType)
            ->when($selectedBranchId, fn ($q) => $q->whereHas('department', fn ($department) => $department->where('branch_id', $selectedBranchId)))
            ->when($subjectType === 'college' && $programId, fn ($q) => $q->where('program_id', $programId))
            ->when($subjectType === 'shs' && $strandId, fn ($q) => $q->where('strand_id', $strandId))
            ->when($isGenEd !== null && $isGenEd !== '', fn ($q) => $q->where('is_gened', (int) $isGenEd))
            ->when($search, function ($q) use ($search) {
                $q->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $teachers = Teacher::query()
            ->select('id', 'branch_id', 'department_id', 'firstname', 'middlename', 'lastname')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($scopedId, fn ($q) => $q->where('branch_id', $scopedId))
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->get()
            ->map(function (Teacher $teacher) {
                return [
                    'id' => $teacher->id,
                    'branch_id' => $teacher->branch_id,
                    'department_id' => $teacher->department_id,
                    'full_name' => $teacher->full_name,
                ];
            });

        $teacherNames = $teachers->pluck('full_name', 'id');
        $subjects->getCollection()->transform(function (Subject $subject) use ($teacherNames) {
            $teacherIds = collect($subject->teacher_id ?? [])
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->values();

            $subject->assigned_teacher_names = $teacherIds
                ->map(fn ($id) => $teacherNames[$id] ?? null)
                ->filter()
                ->values()
                ->all();

            return $subject;
        });

        $titleMap = [
            'college' => 'College',
            'senior-high' => 'Senior High',
            'junior-high' => 'Junior High',
            'grade-school' => 'Grade School',
        ];

        return Inertia::render('Admin/Subjects', [
            'subjects' => $subjects,
            'filters' => [
                'search' => $search,
                'branch_id' => $selectedBranchId,
                'program_id' => $subjectType === 'college' ? $programId : null,
                'strand_id' => $subjectType === 'shs' ? $strandId : null,
                'is_gened' => $isGenEd,
            ],
            'educationType' => $educationType,
            'educationLevelName' => $titleMap[$educationType] ?? 'College',
            'subjectType' => $subjectType,
            'branches' => $branches,
            'selectedBranchId' => $selectedBranchId,
            'scopedBranchId' => $scopedId,
            'departments' => Department::query()
                ->select('id', 'name', 'branch_id')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->when($scopedId, fn ($q) => $q->where('branch_id', $scopedId))
                ->where(function ($query) use ($departmentFilter) {
                    $departmentFilter($query);
                })
                ->orderBy('name')
                ->get(),
            'programs' => Program::query()
                ->select('id', 'name', 'department_id')
                ->where('is_deleted', 0)
                ->when($subjectType === 'college', fn ($q) => $q->whereHas('department', fn ($department) => $department
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->when($scopedId, fn ($branchQuery) => $branchQuery->where('branch_id', $scopedId))
                ))
                ->orderBy('name')
                ->get(),
            'strands' => Strand::query()
                ->select('id', 'name', 'department_id')
                ->where('is_deleted', 0)
                ->when($subjectType === 'shs', fn ($q) => $q->whereHas('department', fn ($department) => $department
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->when($scopedId, fn ($branchQuery) => $branchQuery->where('branch_id', $scopedId))
                ))
                ->orderBy('name')
                ->get(),
            'teachers' => $teachers->values(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateSubject($request);
        $validated['code'] = $this->generateSubjectCode($validated);

        Subject::create($validated);

        return back()->with('success', 'Subject created successfully.');
    }

    public function update(Request $request, Subject $subject)
    {
        $validated = $this->validateSubject($request, $subject);
        $validated['code'] = $subject->code ?: $this->generateSubjectCode($validated, $subject->id);

        $subject->update($validated);

        return back()->with('success', 'Subject updated successfully.');
    }

    public function destroy(Subject $subject)
    {
        $subject->update(['is_deleted' => 1]);

        return back()->with('success', 'Subject deleted.');
    }

    private function validateSubject(Request $request, ?Subject $subject = null): array
    {
        $scopedId = $this->scopedBranchId();
        $validated = $request->validate([
            'branch_id' => [
                'required',
                'integer',
                Rule::exists('branch', 'id')->where(fn ($query) => $query->where('is_deleted', 0)),
            ],
            'department_id' => 'nullable|exists:department,id',
            'program_id' => 'nullable|exists:program,id',
            'strand_id' => 'nullable|exists:strand,id',
            'name' => 'required|string|max:150',
            'type' => 'required|string|in:college,shs,jhs,elementary',
            'is_gened' => 'boolean',
            'is_activated' => 'boolean',
            'teacher_ids' => 'nullable|array',
            'teacher_ids.*' => 'nullable|integer|exists:teacher,id',
        ]);

        if ($scopedId !== null) {
            $validated['branch_id'] = $scopedId;
        }

        if ($validated['type'] === 'college') {
            if (empty($validated['program_id'])) {
                throw ValidationException::withMessages([
                    'program_id' => 'The selected program is required.',
                ]);
            }

            $program = Program::query()
                ->where('id', $validated['program_id'])
                ->where('is_deleted', 0)
                ->with('department:id,branch_id')
                ->firstOrFail();

            if ((int) ($program->department?->branch_id ?? 0) !== (int) $validated['branch_id']) {
                throw ValidationException::withMessages([
                    'program_id' => 'The selected program must belong to the chosen branch.',
                ]);
            }

            $validated['department_id'] = $program->department_id;
            $validated['strand_id'] = null;
        } elseif ($validated['type'] === 'shs') {
            $validated['program_id'] = null;
            $validated['department_id'] = $this->resolveDepartmentIdForEducationType((int) $validated['branch_id'], $validated['type']);

            if (empty($validated['strand_id'])) {
                throw ValidationException::withMessages([
                    'strand_id' => 'The selected strand is required.',
                ]);
            }

            $strand = Strand::query()
                ->where('id', $validated['strand_id'])
                ->where('is_deleted', 0)
                ->firstOrFail();

            if ((int) $strand->department_id !== (int) $validated['department_id']) {
                throw ValidationException::withMessages([
                    'strand_id' => 'The selected strand must belong to the chosen branch.',
                ]);
            }
        } else {
            $validated['program_id'] = null;
            $validated['strand_id'] = null;
            $validated['department_id'] = $this->resolveDepartmentIdForEducationType((int) $validated['branch_id'], $validated['type']);
        }

        if (empty($validated['department_id'])) {
            throw ValidationException::withMessages([
                'branch_id' => 'The selected department is required.',
            ]);
        }

        $department = Department::query()
            ->where('id', $validated['department_id'])
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->firstOrFail();

        if ((int) $department->branch_id !== (int) $validated['branch_id']) {
            throw ValidationException::withMessages([
                'branch_id' => 'The selected department does not belong to the selected branch.',
            ]);
        }

        $validated['teacher_id'] = collect($validated['teacher_ids'] ?? [])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        foreach ($validated['teacher_id'] as $teacherId) {
            $teacher = Teacher::query()
                ->where('id', $teacherId)
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->firstOrFail();

            if ((int) $teacher->branch_id !== (int) $validated['branch_id'] || (int) $teacher->department_id !== (int) $validated['department_id']) {
                throw ValidationException::withMessages([
                    'teacher_ids' => 'Selected teachers must belong to the chosen branch and department.',
                ]);
            }
        }

        unset($validated['branch_id']);
        unset($validated['teacher_ids']);
        $validated['is_deleted'] = 0;

        return $validated;
    }

    private function resolveDepartmentIdForEducationType(int $branchId, string $educationType): int
    {
        $department = Department::query()
            ->where('branch_id', $branchId)
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->where(function ($query) use ($educationType) {
                match ($educationType) {
                    'college' => $query->where('name', 'like', '%College%')->orWhere('code', 'like', '%COL%'),
                    'shs' => $query->where('name', 'like', '%Senior High%')->orWhere('code', 'like', '%SHS%'),
                    'jhs' => $query->where('name', 'like', '%Junior High%')->orWhere('code', 'like', '%JHS%'),
                    'elementary' => $query->where('name', 'like', '%Elementary%')->orWhere('code', 'like', '%ELEM%'),
                    default => $query->whereRaw('1 = 0'),
                };
            })
            ->orderBy('id')
            ->first();

        if (! $department) {
            throw ValidationException::withMessages([
                'branch_id' => 'No matching department was found for the selected branch.',
            ]);
        }

        return (int) $department->id;
    }

    private function generateSubjectCode(array $validated, ?int $ignoreId = null): string
    {
        $department = Department::query()
            ->with('branch:id,code')
            ->findOrFail($validated['department_id']);

        $branchCode = strtoupper($department->branch?->code ?: 'BR');
        $typeCode = match ($validated['type']) {
            'college' => 'COL',
            'shs' => 'SHS',
            'jhs' => 'JHS',
            'elementary' => 'ELEM',
            default => 'SUB',
        };

        $nameParts = preg_split('/\s+/', trim((string) $validated['name'])) ?: [];
        $nameCode = collect($nameParts)
            ->reject(fn ($word) => $word === '' || in_array(strtolower($word), ['of', 'in', 'and', 'the']))
            ->map(fn ($word) => strtoupper(Str::substr($word, 0, 1)))
            ->join('');

        $base = 'SUB-' . $typeCode . '-' . substr($nameCode ?: 'GEN', 0, 6) . '-' . $branchCode;
        $code = $base;
        $suffix = 2;

        while (
            Subject::query()
                ->where('code', $code)
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $code = $base . '-' . $suffix;
            $suffix++;
        }

        return $code;
    }
}
