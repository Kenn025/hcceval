<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTeacherRequest;
use App\Http\Requests\Admin\UpdateTeacherRequest;
use App\Models\Branch;
use App\Models\Department;
use App\Models\EducationLevel;
use App\Models\Program;
use App\Models\Strand;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $search   = $request->input('search', '');
        $scopedId = $this->scopedBranchId();
        $branchId = $scopedId ?? $request->input('branch_id');
        $departmentId = $request->input('department_id');
        $departmentType = $request->input('department_type');
        $programId = $request->input('program_id');
        $programName = $request->input('program_name');
        $strandId = $request->input('strand_id');
        $strandName = $request->input('strand_name');
        $branches = Branch::query()
            ->select('id', 'name', 'code')
            ->where('is_deleted', 0)
            ->where('code', '!=', 'OVERALL')
            ->when($scopedId, fn ($query) => $query->where('id', $scopedId))
            ->orderBy('name')
            ->get();

        $perPage = $request->integer('per_page', 20);
        $perPage = in_array($perPage, [10, 20, 50, 100, 250]) ? $perPage : 20;

        $teachers = Teacher::query()
            ->with(['branch:id,name', 'department:id,name', 'program:id,name', 'strand:id,name'])
            ->where('is_deleted', 0)
            ->when($this->isBranchAdmin(), fn ($q) => $q->where('role', 'Program Chair'))
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
            ->when($departmentType, fn ($q) => $q->whereHas('department', function ($department) use ($departmentType) {
                $department->where(function ($query) use ($departmentType) {
                    match ($departmentType) {
                        'college' => $query->where('name', 'like', '%College%')->orWhere('code', 'like', '%COL%'),
                        'senior-high' => $query->where('name', 'like', '%Senior High%')->orWhere('code', 'like', '%SHS%'),
                        'junior-high' => $query->where('name', 'like', '%Junior High%')->orWhere('code', 'like', '%JHS%'),
                        'elementary' => $query->where('name', 'like', '%Elementary%')->orWhere('code', 'like', '%ELEM%'),
                        default => $query->whereRaw('1 = 0'),
                    };
                });
            }))
            ->when($programId, fn ($q) => $q->where('program_id', $programId))
            ->when($programName, fn ($q) => $q->whereHas('program', fn ($program) => $program->where('name', $programName)->orWhere('name', 'like', $programName . ' - %')))
            ->when($strandId, fn ($q) => $q->where('strand_id', $strandId))
            ->when($strandName, fn ($q) => $q->whereHas('strand', fn ($strand) => $strand->where('name', $strandName)->orWhere('name', 'like', $strandName . ' - %')))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('firstname', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->paginate($perPage)
            ->withQueryString();

        $teacherIds = $teachers->getCollection()->pluck('id')->map(fn ($id) => (int) $id)->values();
        $subjects = Subject::query()
            ->select('id', 'code', 'name', 'department_id', 'program_id', 'strand_id', 'teacher_id')
            ->with(['department:id,name', 'program:id,name', 'strand:id,name'])
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($teacherIds->isEmpty(), fn ($query) => $query->whereRaw('1 = 0'))
            ->when($teacherIds->isNotEmpty(), function ($query) use ($teacherIds) {
                $query->where(function ($subjectQuery) use ($teacherIds) {
                    foreach ($teacherIds as $teacherId) {
                        $subjectQuery->orWhereJsonContains('teacher_id', $teacherId);
                    }
                });
            })
            ->get();

        $subjectIds = $subjects->pluck('id')->map(fn ($id) => (int) $id)->values();
        $yearLevels = EducationLevel::query()
            ->select('id', 'department_id', 'program_id', 'strand_id', 'year_level', 'section', 'subject_id', 'subject_teacher_map')
            ->with(['department:id,name', 'program:id,name', 'strand:id,name'])
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($subjectIds->isEmpty(), fn ($query) => $query->whereRaw('1 = 0'))
            ->when($subjectIds->isNotEmpty(), function ($query) use ($subjectIds) {
                $query->where(function ($levelQuery) use ($subjectIds) {
                    foreach ($subjectIds as $subjectId) {
                        $levelQuery->orWhereJsonContains('subject_id', $subjectId);
                    }
                });
            })
            ->get();

        $teachers->getCollection()->transform(function (Teacher $teacher) use ($subjects, $yearLevels) {
            $teacherId = (int) $teacher->id;

            $teacher->assigned_subjects = $subjects
                ->filter(fn (Subject $subject) => collect($subject->teacher_id ?? [])->map(fn ($id) => (int) $id)->contains($teacherId))
                ->flatMap(function (Subject $subject) use ($teacherId, $yearLevels) {
                    $matchingYearLevels = $yearLevels
                        ->filter(function (EducationLevel $yearLevel) use ($subject, $teacherId) {
                            $subjectKey = (string) $subject->id;
                            $levelSubjectIds = collect($yearLevel->subject_id ?? [])->map(fn ($id) => (int) $id);
                            $assignedTeacherId = data_get($yearLevel->subject_teacher_map ?? [], $subjectKey);

                            return $levelSubjectIds->contains((int) $subject->id)
                                && (! $assignedTeacherId || (int) $assignedTeacherId === $teacherId);
                        });

                    if ($matchingYearLevels->isEmpty()) {
                        return [[
                            'subject_id' => $subject->id,
                            'subject_code' => $subject->code,
                            'subject_name' => $subject->name,
                            'year_level_id' => null,
                            'year_level' => null,
                            'department' => $subject->department?->name,
                            'program_strand' => $subject->program?->name ?? $subject->strand?->name,
                        ]];
                    }

                    return $matchingYearLevels
                        ->map(fn (EducationLevel $yearLevel) => [
                            'subject_id' => $subject->id,
                            'subject_code' => $subject->code,
                            'subject_name' => $subject->name,
                            'year_level_id' => $yearLevel->id,
                            'year_level' => trim(($yearLevel->year_level ?? '-') . ' - ' . ($yearLevel->section ?? '-')),
                            'department' => $yearLevel->department?->name ?? $subject->department?->name,
                            'program_strand' => $yearLevel->program?->name ?? $yearLevel->strand?->name ?? $subject->program?->name ?? $subject->strand?->name,
                        ]);
                })
                ->unique(fn ($item) => $item['subject_id'] . ':' . $item['year_level_id'])
                ->values()
                ->all();

            return $teacher;
        });

        return Inertia::render('Admin/Teachers', [
            'teachers'      => $teachers,
            'filters'       => [
                'search' => $search, 
                'branch_id' => $branchId,
                'department_id' => $departmentId,
                'department_type' => $departmentType,
                'program_id' => $programId,
                'program_name' => $programName,
                'strand_id' => $strandId,
                'strand_name' => $strandName,
                'per_page' => $perPage,
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

    public function store(StoreTeacherRequest $request)
    {
        $payload = $this->teacherPayloadFromRequest($request);

        if ($message = $this->emailInUseMessage($payload['email'])) {
            return back()->withErrors(['email' => $message])->withInput();
        }

        Teacher::create($this->mapTeacherPayload($payload));

        return back()->with('success', 'Teacher created successfully.');
    }

    public function update(UpdateTeacherRequest $request, Teacher $teacher)
    {
        $payload = $this->teacherPayloadFromRequest($request);

        if ($message = $this->emailInUseMessage($payload['email'], $teacher->id)) {
            return back()->withErrors(['email' => $message])->withInput();
        }

        $teacher->update($this->mapTeacherPayload($payload, false));

        return back()->with('success', 'Teacher updated successfully.');
    }

    public function checkEmailAvailability(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|max:150',
            'teacher_id' => 'nullable|integer',
        ]);

        $message = $this->emailInUseMessage($validated['email'], $validated['teacher_id'] ?? null);

        return response()->json([
            'available' => $message === null,
            'message' => $message,
        ]);
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
            $payload['password'] = \App\Services\LegacyHash::make($validated['password']);
        } elseif ($includeDefaultPassword) {
            $payload['password'] = \App\Services\LegacyHash::make('hcc1234');
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

    private function emailInUseMessage(?string $email, ?int $ignoreTeacherId = null): ?string
    {
        $normalizedEmail = strtolower(trim((string) $email));

        if ($normalizedEmail === '') {
            return null;
        }

        $checks = [
            ['table' => 'admin', 'label' => 'an admin account', 'ignore_id' => null],
            ['table' => 'teacher', 'label' => 'a teacher account', 'ignore_id' => $ignoreTeacherId],
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
