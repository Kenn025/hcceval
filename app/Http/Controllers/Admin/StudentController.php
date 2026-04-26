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
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class StudentController extends Controller
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
        $yearLevelId = $request->input('year_level_id');
        $yearLevel = $request->input('year_level');
        $branches = Branch::query()
            ->select('id', 'name', 'code')
            ->where('is_deleted', 0)
            ->where('code', '!=', 'OVERALL')
            ->when($scopedId, fn ($query) => $query->where('id', $scopedId))
            ->orderBy('name')
            ->get();

        $perPage = $request->integer('per_page', 20);
        $perPage = in_array($perPage, [10, 20, 50, 100, 250]) ? $perPage : 20;

        $students = Student::query()
            ->with(['branch:id,name', 'department:id,name', 'program:id,name', 'strand:id,name', 'yearLevel:id,year_level,section,strand_id,subject_id,subject_teacher_map', 'irregSubject:id,code,name'])
            ->where('is_deleted', 0)
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
            ->when($yearLevelId, fn ($q) => $q->where('education_level_id', $yearLevelId))
            ->when($yearLevel !== null && $yearLevel !== '', fn ($q) => $q->whereHas('yearLevel', fn ($level) => $level->where('year_level', $yearLevel)))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('firstname', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $teachers = Teacher::query()
            ->select('id', 'firstname', 'middlename', 'lastname')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($scopedId, fn ($q) => $q->where('branch_id', $scopedId))
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->get()
            ->map(fn (Teacher $teacher) => [
                'id' => $teacher->id,
                'full_name' => $teacher->full_name,
            ]);

        $teacherNames = $teachers->pluck('full_name', 'id');
        $subjectCollection = Subject::query()
            ->select('id', 'code', 'name', 'department_id', 'program_id', 'strand_id', 'type', 'teacher_id', 'is_gened')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($scopedId, fn ($q) => $q->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
            ->orderBy('name')
            ->get();

        $subjectReference = $subjectCollection
            ->keyBy('id')
            ->map(function (Subject $subject) use ($teacherNames) {
                $teacherIds = collect($subject->teacher_id ?? [])
                    ->filter()
                    ->map(fn ($id) => (int) $id)
                    ->values();

                return [
                    'id' => $subject->id,
                    'code' => $subject->code,
                    'name' => $subject->name,
                    'department_id' => $subject->department_id,
                    'program_id' => $subject->program_id,
                    'strand_id' => $subject->strand_id,
                    'type' => $subject->type,
                    'is_gened' => (bool) $subject->is_gened,
                    'teacher_id' => $teacherIds->all(),
                    'assigned_teacher_names' => $teacherIds
                        ->map(fn ($id) => $teacherNames[$id] ?? null)
                        ->filter()
                        ->values()
                        ->all(),
                ];
            });

        $students->getCollection()->transform(function (Student $student) use ($subjectReference, $teacherNames) {
            $removedMap = collect($student->removed_subject_map ?? []);
            $irregMap = collect($student->irreg_subject_map ?? []);

            $student->removed_subjects = $removedMap
                ->map(function ($teacherId, $subjectId) use ($subjectReference, $teacherNames) {
                    $subject = $subjectReference->get((int) $subjectId);

                    if (! $subject) {
                        return null;
                    }

                    return [
                        'id' => $subject['id'],
                        'code' => $subject['code'],
                        'name' => $subject['name'],
                        'is_gened' => $subject['is_gened'],
                        'teacher_id' => $teacherId ? (int) $teacherId : null,
                        'teacher_name' => $teacherId ? ($teacherNames[(int) $teacherId] ?? null) : null,
                    ];
                })
                ->filter()
                ->values()
                ->all();

            $student->irregular_subjects = $irregMap
                ->map(function ($teacherId, $subjectId) use ($subjectReference, $teacherNames) {
                    $subject = $subjectReference->get((int) $subjectId);

                    if (! $subject) {
                        return null;
                    }

                    return [
                        'id' => $subject['id'],
                        'code' => $subject['code'],
                        'name' => $subject['name'],
                        'is_gened' => $subject['is_gened'],
                        'teacher_id' => $teacherId ? (int) $teacherId : null,
                        'teacher_name' => $teacherId ? ($teacherNames[(int) $teacherId] ?? null) : null,
                    ];
                })
                ->filter()
                ->values()
                ->all();

            $removedSubjectIds = $removedMap
                ->keys()
                ->map(fn ($id) => (int) $id)
                ->all();

            $regularSubjects = collect($student->yearLevel?->subject_id ?? [])
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->reject(fn ($subjectId) => in_array($subjectId, $removedSubjectIds, true))
                ->map(function (int $subjectId) use ($student, $subjectReference, $teacherNames) {
                    $subject = $subjectReference->get($subjectId);

                    if (! $subject) {
                        return null;
                    }

                    $teacherId = data_get($student->yearLevel?->subject_teacher_map ?? [], (string) $subjectId);

                    if (! $teacherId) {
                        $teacherId = collect($subject['teacher_id'] ?? [])
                            ->filter()
                            ->map(fn ($id) => (int) $id)
                            ->first();
                    }

                    return [
                        'id' => $subject['id'],
                        'code' => $subject['code'],
                        'name' => $subject['name'],
                        'is_gened' => $subject['is_gened'],
                        'teacher_id' => $teacherId ? (int) $teacherId : null,
                        'teacher_name' => $teacherId ? ($teacherNames[(int) $teacherId] ?? null) : null,
                    ];
                })
                ->filter()
                ->values();

            $student->regular_subjects = [
                'major' => $regularSubjects
                    ->reject(fn ($subject) => (bool) ($subject['is_gened'] ?? false))
                    ->values()
                    ->all(),
                'minor' => $regularSubjects
                    ->filter(fn ($subject) => (bool) ($subject['is_gened'] ?? false))
                    ->values()
                    ->all(),
            ];

            return $student;
        });

        return Inertia::render('Admin/Students', [
            'students'    => $students,
            'filters'     => [
                'search' => $search,
                'branch_id' => $branchId,
                'department_id' => $departmentId,
                'department_type' => $departmentType,
                'program_id' => $programId,
                'program_name' => $programName,
                'strand_id' => $strandId,
                'strand_name' => $strandName,
                'year_level_id' => $yearLevelId,
                'year_level' => $yearLevel,
                'per_page' => $perPage,
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
                ->select('id', 'department_id', 'program_id', 'strand_id', 'subject_id', 'subject_teacher_map', 'year_level', 'section')
                ->selectRaw("CONCAT(year_level, ' - ', section) as name")
                ->where('is_deleted', 0)
                ->when($scopedId, fn ($q) => $q->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
                ->orderBy('year_level')
                ->orderBy('section')
                ->get(),
            'subjects' => $subjectReference->values(),
            'teachers' => $teachers->values(),
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

        if ($message = $this->emailInUseMessage($payload['email'])) {
            return back()->withErrors(['email' => $message])->withInput();
        }

        Student::create($this->mapStudentPayload($payload));

        return back()->with('success', 'Student created successfully.');
    }

    public function update(UpdateStudentRequest $request, Student $student)
    {
        $payload = $this->studentPayloadFromRequest($request);

        if ($message = $this->emailInUseMessage($payload['email'], $student->id)) {
            return back()->withErrors(['email' => $message])->withInput();
        }

        $student->update($this->mapStudentPayload($payload, false));

        return back()->with('success', 'Student updated successfully.');
    }

    public function checkEmailAvailability(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|max:150',
            'student_id' => 'nullable|integer',
        ]);

        $message = $this->emailInUseMessage($validated['email'], $validated['student_id'] ?? null);

        return response()->json([
            'available' => $message === null,
            'message' => $message,
        ]);
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
            'subject_id' => [],
            'removed_subject_map' => $validated['removed_subject_map'] ?? [],
            'is_irreg' => (bool) ($validated['is_irreg'] ?? false),
            'irreg_subject_id' => ! empty($validated['is_irreg'])
                ? collect($validated['irreg_subject_map'] ?? [])->keys()->map(fn ($id) => (int) $id)->first()
                : null,
            'irreg_subject_map' => ! empty($validated['is_irreg']) ? ($validated['irreg_subject_map'] ?? []) : [],
            'firstname' => $validated['first_name'],
            'middlename' => $validated['middle_name'] ?? null,
            'lastname' => $validated['last_name'],
            'email' => $validated['email'],
            'is_activated' => $status === 'active',
            'is_deleted' => 0,
        ];

        if (! empty($validated['password'])) {
            $payload['password'] = \App\Services\LegacyHash::make($validated['password']);
        } elseif ($includeDefaultPassword) {
            $payload['password'] = \App\Services\LegacyHash::make('hcc1234');
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

        $payload = [
            'student_no' => $request->input('student_no'),
            'branch_id' => $scopedBranchId ?? $request->input('branch_id'),
            'department_id' => $request->input('department_id'),
            'program_id' => $request->input('program_id'),
            'strand_id' => $request->input('strand_id'),
            'year_level_id' => $request->input('year_level_id'),
            'removed_subject_ids' => $request->input('removed_subject_ids', []),
            'is_irreg' => $request->boolean('is_irreg'),
            'irreg_subject_ids' => $request->input('irreg_subject_ids', []),
            'irreg_subject_teacher_ids' => $request->input('irreg_subject_teacher_ids', []),
            'first_name' => $request->input('first_name'),
            'middle_name' => $request->input('middle_name'),
            'last_name' => $request->input('last_name'),
            'suffix_name' => $request->input('suffix_name'),
            'email' => $request->input('email'),
            'password' => $request->input('password'),
            'status' => $request->input('status', 'active'),
        ];

        return $this->normalizeStudentSubjectSelections($payload);
    }

    protected function normalizeStudentSubjectSelections(array $payload): array
    {
        $yearLevel = ! empty($payload['year_level_id'])
            ? EducationLevel::query()
                ->select('id', 'department_id', 'program_id', 'strand_id', 'subject_id', 'subject_teacher_map')
                ->where('id', $payload['year_level_id'])
                ->where('is_deleted', 0)
                ->first()
            : null;

        if (
            $yearLevel &&
            (
                (int) $yearLevel->department_id !== (int) ($payload['department_id'] ?? 0)
                || (! empty($payload['program_id']) && (int) ($yearLevel->program_id ?? 0) !== (int) $payload['program_id'])
                || (! empty($payload['strand_id']) && (int) ($yearLevel->strand_id ?? 0) !== (int) $payload['strand_id'])
            )
        ) {
            throw ValidationException::withMessages([
                'year_level_id' => 'The selected year level does not match the current department, program, or strand.',
            ]);
        }

        $regularSubjectIds = collect($yearLevel?->subject_id ?? [])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values();

        $removedSubjectIds = collect($payload['removed_subject_ids'] ?? [])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $invalidRemoved = $removedSubjectIds->diff($regularSubjectIds);

        if ($invalidRemoved->isNotEmpty()) {
            throw ValidationException::withMessages([
                'removed_subject_ids' => 'Removed subjects must come from the selected year level.',
            ]);
        }

        $payload['removed_subject_map'] = $removedSubjectIds
            ->mapWithKeys(function (int $subjectId) use ($yearLevel) {
                $teacherId = data_get($yearLevel?->subject_teacher_map ?? [], (string) $subjectId);

                if (! $teacherId) {
                    $subject = Subject::query()
                        ->select('id', 'teacher_id')
                        ->where('id', $subjectId)
                        ->where('is_deleted', 0)
                        ->where('is_activated', 1)
                        ->first();

                    $teacherId = collect($subject?->teacher_id ?? [])
                        ->filter()
                        ->map(fn ($id) => (int) $id)
                        ->first();
                }

                return [(string) $subjectId => $teacherId ? (int) $teacherId : null];
            })
            ->all();

        $irregularSubjectIds = collect($payload['irreg_subject_ids'] ?? [])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $regularSubjectSet = $regularSubjectIds
            ->diff($removedSubjectIds)
            ->values();

        $payload['irreg_subject_map'] = [];

        if (! empty($payload['is_irreg'])) {
            foreach ($irregularSubjectIds as $subjectId) {
                if ($regularSubjectSet->contains($subjectId)) {
                    throw ValidationException::withMessages([
                        'irreg_subject_ids' => 'Irregular subjects must not already belong to the active regular year-level subjects.',
                    ]);
                }

                $subject = Subject::query()
                    ->select('id', 'department_id', 'program_id', 'strand_id', 'teacher_id', 'is_gened')
                    ->where('id', $subjectId)
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->firstOrFail();

                if ((int) $subject->department_id !== (int) ($payload['department_id'] ?? 0)) {
                    throw ValidationException::withMessages([
                        'irreg_subject_ids' => 'Irregular subjects must belong to the selected department.',
                    ]);
                }

                if (! empty($payload['program_id'])) {
                    $selectedProgramId = (int) $payload['program_id'];
                    $subjectProgramId = (int) ($subject->program_id ?? 0);
                    $isGenEdSubject = (bool) $subject->is_gened;

                    if (! $isGenEdSubject && $subjectProgramId !== $selectedProgramId) {
                        throw ValidationException::withMessages([
                            'irreg_subject_ids' => 'Irregular major subjects must belong to the selected program.',
                        ]);
                    }

                }

                if (! empty($payload['strand_id']) && (int) ($subject->strand_id ?? 0) !== (int) $payload['strand_id']) {
                    throw ValidationException::withMessages([
                        'irreg_subject_ids' => 'Irregular subjects must belong to the selected strand.',
                    ]);
                }

                $teacherId = data_get($payload['irreg_subject_teacher_ids'] ?? [], (string) $subjectId);
                $teacherId = $teacherId ? (int) $teacherId : null;
                $availableTeacherIds = collect($subject->teacher_id ?? [])
                    ->filter()
                    ->map(fn ($id) => (int) $id)
                    ->values();

                if ($teacherId !== null && ! $availableTeacherIds->contains($teacherId)) {
                    throw ValidationException::withMessages([
                        'irreg_subject_teacher_ids' => 'Irregular subject teachers must come from the teachers assigned to each subject.',
                    ]);
                }

                $payload['irreg_subject_map'][(string) $subjectId] = $teacherId;
            }
        }

        return $payload;
    }

    private function emailInUseMessage(?string $email, ?int $ignoreStudentId = null): ?string
    {
        $normalizedEmail = strtolower(trim((string) $email));

        if ($normalizedEmail === '') {
            return null;
        }

        $checks = [
            ['table' => 'admin', 'label' => 'an admin account', 'ignore_id' => null],
            ['table' => 'teacher', 'label' => 'a teacher account', 'ignore_id' => null],
            ['table' => 'student', 'label' => 'a student account', 'ignore_id' => $ignoreStudentId],
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
