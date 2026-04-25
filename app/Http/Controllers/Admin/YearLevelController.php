<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\EducationLevel;
use App\Models\Program;
use App\Models\Strand;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class YearLevelController extends Controller
{
    private const SUBJECT_TYPE_MAP = [
        'college' => 'college',
        'senior-high' => 'shs',
        'junior-high' => 'jhs',
        'grade-school' => 'elementary',
    ];

    public function index(Request $request, string $educationType = 'college')
    {
        $search = $request->input('search', '');
        $scopedId = $this->scopedBranchId();
        $requestedBranchId = $request->integer('branch_id');
        $selectedProgramId = $request->integer('program_id');
        $selectedYearLevel = $request->input('year_level');

        $levelMap = [
            'college' => 'College',
            'senior-high' => 'Senior High',
            'junior-high' => 'Junior High',
            'grade-school' => 'Elementary',
        ];

        $levelName = $levelMap[$educationType] ?? 'College';
        $subjectType = self::SUBJECT_TYPE_MAP[$educationType] ?? 'college';
        $departmentFilter = match ($educationType) {
            'college' => fn ($query) => $query->where('name', 'like', '%College%')->orWhere('code', 'like', '%COL%'),
            'senior-high' => fn ($query) => $query->where('name', 'like', '%Senior High%')->orWhere('code', 'like', '%SHS%'),
            'junior-high' => fn ($query) => $query->where('name', 'like', '%Junior High%')->orWhere('code', 'like', '%JHS%'),
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

        $yearLevels = EducationLevel::query()
            ->with(['department:id,name,branch_id', 'department.branch:id,name', 'program:id,name', 'strand:id,name'])
            ->where('is_deleted', 0)
            ->when($educationType === 'college', fn ($q) => $q->whereNotNull('program_id'))
            ->when($educationType !== 'college', fn ($q) => $q->whereNull('program_id'))
            ->when($selectedProgramId && $educationType === 'college', fn ($q) => $q->where('program_id', $selectedProgramId))
            ->when($selectedYearLevel, fn ($q) => $q->where('year_level', $selectedYearLevel))
            ->when($search, function ($q) use ($search) {
                $q->where(function ($query) use ($search) {
                    $query->where('year_level', 'like', "%{$search}%")
                        ->orWhere('section', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->orderByRaw('CAST(year_level AS UNSIGNED) asc')
            ->orderBy('section')
            ->paginate(15)
            ->withQueryString();

        $yearLevels->getCollection()->transform(function (EducationLevel $level) {
            $level->display_name = $this->displayName($level->year_level, $level->section, $level->program_id !== null);
            $level->adviser_teacher_id = data_get($level->teacher_id, '0');
            $level->subject_teacher_map = is_array($level->subject_teacher_map) ? $level->subject_teacher_map : [];

            return $level;
        });

        $advisers = Teacher::query()
            ->select('id', 'branch_id', 'department_id', 'program_id', 'firstname', 'middlename', 'lastname')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($scopedId, fn ($q) => $q->where('branch_id', $scopedId))
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->get()
            ->map(fn (Teacher $teacher) => [
                'id' => $teacher->id,
                'branch_id' => $teacher->branch_id,
                'department_id' => $teacher->department_id,
                'program_id' => $teacher->program_id,
                'full_name' => $teacher->full_name,
            ]);

        return Inertia::render('Admin/YearLevels', [
            'yearLevels' => $yearLevels,
            'filters' => [
                'search' => $search,
                'branch_id' => $selectedBranchId,
                'program_id' => $selectedProgramId,
                'year_level' => $selectedYearLevel,
            ],
            'educationType' => $educationType,
            'educationLevelName' => $levelName,
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
                ->with('department:id,branch_id')
                ->where('is_deleted', 0)
                ->whereHas('department', fn ($q) => $q
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->when($scopedId, fn ($branchQuery) => $branchQuery->where('branch_id', $scopedId)))
                ->orderBy('name')
                ->get()
                ->map(fn (Program $program) => [
                    'id' => $program->id,
                    'name' => $program->name,
                    'department_id' => $program->department_id,
                    'branch_id' => $program->department?->branch_id,
                ]),
            'strands' => Strand::query()
                ->select('id', 'name', 'department_id')
                ->where('is_deleted', 0)
                ->whereHas('department', fn ($q) => $q
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->when($scopedId, fn ($branchQuery) => $branchQuery->where('branch_id', $scopedId))
                    ->where(function ($departmentQuery) {
                        $departmentQuery->where('name', 'like', '%Senior High%')
                            ->orWhere('code', 'like', '%SHS%');
                    }))
                ->orderBy('name')
                ->get(),
            'subjects' => Subject::query()
                ->select('id', 'name', 'code', 'department_id', 'program_id', 'strand_id', 'teacher_id')
                ->with('department:id,branch_id')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->where('type', $subjectType)
                ->when($scopedId, fn ($q) => $q->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
                ->orderBy('name')
                ->get()
                ->map(fn (Subject $subject) => [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'code' => $subject->code,
                    'department_id' => $subject->department_id,
                    'program_id' => $subject->program_id,
                    'strand_id' => $subject->strand_id,
                    'branch_id' => $subject->department?->branch_id,
                    'teacher_ids' => collect($subject->teacher_id ?? [])
                        ->filter()
                        ->map(fn ($id) => (int) $id)
                        ->values()
                        ->all(),
                ]),
            'advisers' => $advisers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateEducationLevel($request);
        $validated['code'] = $this->generateEducationLevelCode($validated);

        EducationLevel::create($validated);

        return back()->with('success', 'Year level created successfully.');
    }

    public function update(Request $request, EducationLevel $yearLevel)
    {
        $validated = $this->validateEducationLevel($request, $yearLevel);
        $validated['code'] = $yearLevel->code ?: $this->generateEducationLevelCode($validated, $yearLevel->id);

        $yearLevel->update($validated);

        return back()->with('success', 'Year level updated successfully.');
    }

    public function destroy(EducationLevel $yearLevel)
    {
        $yearLevel->update(['is_deleted' => 1]);

        return back()->with('success', 'Year level deleted.');
    }

    private function validateEducationLevel(Request $request, ?EducationLevel $yearLevel = null): array
    {
        $scopedId = $this->scopedBranchId();
        $validated = $request->validate([
            'education_type' => ['nullable', 'string', 'in:college,senior-high,junior-high,grade-school'],
            'branch_id' => [
                'required',
                'integer',
                Rule::exists('branch', 'id')->where(fn ($query) => $query->where('is_deleted', 0)),
            ],
            'department_id' => 'nullable|exists:department,id',
            'program_id' => 'nullable|exists:program,id',
            'strand_id' => 'nullable|exists:strand,id',
            'adviser_teacher_id' => 'nullable|exists:teacher,id',
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'integer|exists:subject,id',
            'subject_teacher_ids' => 'nullable|array',
            'year_level' => 'required|string|max:50',
            'section' => 'required|string|max:50',
        ]);

        $isCollege = ($validated['education_type'] ?? null) === 'college';
        $isSeniorHigh = ($validated['education_type'] ?? null) === 'senior-high';
        $subjectType = self::SUBJECT_TYPE_MAP[$validated['education_type'] ?? 'college'] ?? 'college';

        if ($scopedId !== null) {
            $validated['branch_id'] = $scopedId;
        }

        if ($isCollege) {
            if (empty($validated['program_id'])) {
                throw ValidationException::withMessages([
                    'program_id' => 'The selected program is required.',
                ]);
            }

            $program = Program::query()
                ->where('id', $validated['program_id'])
                ->where('is_deleted', 0)
                ->firstOrFail();

            $validated['department_id'] = $program->department_id;
            $validated['strand_id'] = null;

            $validated['subject_id'] = collect($validated['subject_ids'] ?? [])
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();
            $validated['subject_teacher_map'] = [];

            $subjectTeacherIds = collect($validated['subject_teacher_ids'] ?? [])
                ->mapWithKeys(fn ($teacherId, $subjectId) => [(int) $subjectId => $teacherId ? (int) $teacherId : null]);

            foreach ($validated['subject_id'] as $subjectId) {
                $subject = Subject::query()
                    ->where('id', $subjectId)
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->where('type', 'college')
                    ->firstOrFail();

                if ((int) $subject->department_id !== (int) $validated['department_id'] || (int) ($subject->program_id ?? 0) !== (int) $validated['program_id']) {
                    throw ValidationException::withMessages([
                        'subject_ids' => 'Selected subjects must match the chosen program.',
                    ]);
                }

                $assignedTeacherId = $subjectTeacherIds->get($subjectId);

                if ($assignedTeacherId !== null) {
                    $availableTeacherIds = collect($subject->teacher_id ?? [])
                        ->filter()
                        ->map(fn ($id) => (int) $id)
                        ->values()
                        ->all();

                    if (! in_array($assignedTeacherId, $availableTeacherIds, true)) {
                        throw ValidationException::withMessages([
                            'subject_teacher_ids' => 'Selected subject teachers must come from the teachers assigned to each subject.',
                        ]);
                    }

                    $validated['subject_teacher_map'][(string) $subjectId] = $assignedTeacherId;
                }
            }
        } elseif ($isSeniorHigh) {
            $validated['program_id'] = null;
            $validated['department_id'] = $this->resolveDepartmentIdForEducationType((int) $validated['branch_id'], (string) ($validated['education_type'] ?? ''));

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
                    'strand_id' => 'The selected strand must belong to the senior high department of the chosen branch.',
                ]);
            }

            $validated['subject_id'] = collect($validated['subject_ids'] ?? [])
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();
            $validated['subject_teacher_map'] = [];

            $subjectTeacherIds = collect($validated['subject_teacher_ids'] ?? [])
                ->mapWithKeys(fn ($teacherId, $subjectId) => [(int) $subjectId => $teacherId ? (int) $teacherId : null]);

            foreach ($validated['subject_id'] as $subjectId) {
                $subject = Subject::query()
                    ->where('id', $subjectId)
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->where('type', $subjectType)
                    ->firstOrFail();

                if ((int) $subject->department_id !== (int) $validated['department_id']) {
                    throw ValidationException::withMessages([
                        'subject_ids' => 'Selected subjects must belong to the senior high department.',
                    ]);
                }

                if ((int) ($subject->strand_id ?? 0) !== (int) $validated['strand_id']) {
                    throw ValidationException::withMessages([
                        'subject_ids' => 'Selected subjects must match the chosen strand.',
                    ]);
                }

                $assignedTeacherId = $subjectTeacherIds->get($subjectId);

                if ($assignedTeacherId !== null) {
                    $availableTeacherIds = collect($subject->teacher_id ?? [])
                        ->filter()
                        ->map(fn ($id) => (int) $id)
                        ->values()
                        ->all();

                    if (! in_array($assignedTeacherId, $availableTeacherIds, true)) {
                        throw ValidationException::withMessages([
                            'subject_teacher_ids' => 'Selected subject teachers must come from the teachers assigned to each subject.',
                        ]);
                    }

                    $validated['subject_teacher_map'][(string) $subjectId] = $assignedTeacherId;
                }
            }
        } else {
            $validated['program_id'] = null;
            $validated['strand_id'] = null;
            $validated['department_id'] = $this->resolveDepartmentIdForEducationType((int) $validated['branch_id'], (string) ($validated['education_type'] ?? ''));
            $validated['subject_id'] = $yearLevel?->subject_id ?? [];
            $validated['subject_teacher_map'] = $yearLevel?->subject_teacher_map ?? [];
        }

        if (empty($validated['department_id'])) {
            throw ValidationException::withMessages([
                'department_id' => 'The selected department is required.',
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

        if (empty($validated['program_id'])) {
            $validated['program_id'] = null;
        }

        if (! empty($validated['adviser_teacher_id'])) {
            $adviser = Teacher::query()
                ->where('id', $validated['adviser_teacher_id'])
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->firstOrFail();

            if ((int) $adviser->branch_id !== (int) $validated['branch_id'] || (int) $adviser->department_id !== (int) $validated['department_id']) {
                throw ValidationException::withMessages([
                    'adviser_teacher_id' => 'The selected adviser must match the chosen branch and department.',
                ]);
            }

            if (! empty($validated['strand_id']) && ! in_array((int) $adviser->strand_id, [null, 0, (int) $validated['strand_id']], true)) {
                throw ValidationException::withMessages([
                    'adviser_teacher_id' => 'The selected adviser must match the chosen strand.',
                ]);
            }

            if (! empty($validated['program_id']) && ! in_array((int) $adviser->program_id, [null, 0, (int) $validated['program_id']], true)) {
                throw ValidationException::withMessages([
                    'adviser_teacher_id' => 'The selected adviser must match the chosen program.',
                ]);
            }
        }

        $validated['teacher_id'] = ! empty($validated['adviser_teacher_id'])
            ? [(int) $validated['adviser_teacher_id']]
            : ($yearLevel?->teacher_id ?? []);
        $validated['is_activated'] = $yearLevel?->is_activated ?? 1;
        $validated['is_deleted'] = 0;
        unset($validated['education_type'], $validated['adviser_teacher_id']);
        unset($validated['subject_ids']);
        unset($validated['subject_teacher_ids']);
        unset($validated['branch_id']);

        return $validated;
    }

    private function generateEducationLevelCode(array $validated, ?int $ignoreId = null): string
    {
        $department = Department::query()
            ->with('branch:id,code')
            ->findOrFail($validated['department_id']);

        $branchCode = strtoupper($department->branch?->code ?: 'BR');
        $prefix = $validated['program_id'] ? 'YL' : 'GL';
        $yearValue = strtoupper(Str::slug((string) $validated['year_level'], ''));
        $sectionValue = strtoupper(Str::slug((string) $validated['section'], ''));
        $base = "{$prefix}-{$yearValue}-{$sectionValue}-{$branchCode}";
        $code = $base;
        $suffix = 2;

        while (
            EducationLevel::query()
                ->where('code', $code)
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $code = $base . '-' . $suffix;
            $suffix++;
        }

        return $code;
    }

    private function displayName(?string $yearLevel, ?string $section, bool $isCollege): string
    {
        $prefix = $isCollege ? 'Year ' : 'Grade ';
        $base = trim($prefix . ($yearLevel ?? ''));

        return $section ? "{$base} - Section {$section}" : $base;
    }

    private function resolveDepartmentIdForEducationType(int $branchId, string $educationType): int
    {
        $department = Department::query()
            ->where('branch_id', $branchId)
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->where(function ($query) use ($educationType) {
                match ($educationType) {
                    'senior-high' => $query->where('name', 'like', '%Senior High%')->orWhere('code', 'like', '%SHS%'),
                    'junior-high' => $query->where('name', 'like', '%Junior High%')->orWhere('code', 'like', '%JHS%'),
                    'grade-school' => $query->where('name', 'like', '%Elementary%')->orWhere('code', 'like', '%ELEM%'),
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
}
