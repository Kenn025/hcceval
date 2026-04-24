<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Program;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProgramController extends Controller
{
    private const BASE_PROGRAM_NAME_OPTIONS = [
        'Bachelor of Science in Information Technology',
        'Bachelor of Science in Business Administration',
        'Bachelor of Science in Computer Science',
        'Bachelor of Science in Accountancy',
        'Bachelor of Elementary Education',
        'Bachelor of Secondary Education',
        'Bachelor of Science in Criminology',
        'Bachelor of Science in Hospitality Management',
        'Bachelor of Science in Tourism Management',
        'Bachelor of Science in Nursing',
        'Bachelor of Science in Civil Engineering',
        'Bachelor of Science in Psychology',
    ];

    public function index(Request $request)
    {
        $search = $request->input('search', '');
        $scopedId = $this->scopedBranchId();
        $requestedBranchId = $request->integer('branch_id');
        $programNameOptions = $this->programNameOptions();

        $branches = Branch::query()
            ->select('id', 'name', 'code')
            ->where('is_deleted', 0)
            ->where('code', '!=', 'OVERALL')
            ->when($scopedId, fn ($q) => $q->where('id', $scopedId))
            ->orderBy('name')
            ->get();

        $selectedBranchId = $scopedId
            ?? ($branches->contains('id', $requestedBranchId) ? $requestedBranchId : $branches->first()?->id);

        $programs = Program::query()
            ->with([
                'department:id,name,branch_id',
                'department.branch:id,name',
                'assignedChair:id,program_id,firstname,middlename,lastname',
            ])
            ->where('is_deleted', 0)
            ->when($selectedBranchId, fn ($q) => $q->whereHas('department', fn ($department) => $department->where('branch_id', $selectedBranchId)))
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $offset = ($programs->currentPage() - 1) * $programs->perPage();
        $programs->getCollection()->transform(function (Program $program, int $index) use ($offset) {
            $program->row_number = $offset + $index + 1;
            $program->assigned_chair_name = $program->assignedChair?->full_name;

            return $program;
        });

        $departments = Department::query()
            ->select('id', 'name', 'branch_id')
            ->where('is_deleted', 0)
            ->when($selectedBranchId, fn ($q) => $q->where('branch_id', $selectedBranchId))
            ->orderBy('name')
            ->get();

        $chairs = Teacher::query()
            ->select('id', 'branch_id', 'department_id', 'program_id', 'firstname', 'middlename', 'lastname', 'role')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($selectedBranchId, fn ($q) => $q->where('branch_id', $selectedBranchId))
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->get()
            ->map(function (Teacher $teacher) {
                return [
                    'id' => $teacher->id,
                    'branch_id' => $teacher->branch_id,
                    'department_id' => $teacher->department_id,
                    'program_id' => $teacher->program_id,
                    'role' => $teacher->role,
                    'full_name' => $teacher->full_name,
                ];
            });

        return Inertia::render('Admin/Programs', [
            'programs' => $programs,
            'filters' => ['search' => $search, 'branch_id' => $selectedBranchId],
            'branches' => $branches,
            'departments' => $departments,
            'chairs' => $chairs,
            'programNameOptions' => $programNameOptions,
            'isBranchAdmin' => $this->isBranchAdmin(),
            'scopedBranchId' => $scopedId,
            'selectedBranchId' => $selectedBranchId,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateProgram($request);

        DB::transaction(function () use ($validated) {
            $program = Program::create([
                'department_id' => $validated['department_id'],
                'code' => $this->generateProgramCode($validated['name'], $validated['branch_id']),
                'name' => $validated['name'],
                'duration_years' => $validated['duration_years'],
                'is_activated' => $validated['is_activated'] ?? true,
                'is_deleted' => false,
            ]);

            $this->syncAssignedChair($program, $validated['chair_teacher_id'] ?? null);
        });

        return back()->with('success', 'Program created successfully.');
    }

    public function update(Request $request, Program $program)
    {
        $validated = $this->validateProgram($request, $program);

        DB::transaction(function () use ($validated, $program) {
            $program->update([
                'department_id' => $validated['department_id'],
                'code' => $program->code ?: $this->generateProgramCode($validated['name'], $validated['branch_id'], $program->id),
                'name' => $validated['name'],
                'duration_years' => $validated['duration_years'],
                'is_activated' => $validated['is_activated'] ?? true,
            ]);

            $this->syncAssignedChair($program, $validated['chair_teacher_id'] ?? null);
        });

        return back()->with('success', 'Program updated successfully.');
    }

    public function destroy(Program $program)
    {
        $program->update(['is_deleted' => 1]);

        return back()->with('success', 'Program deleted.');
    }

    private function validateProgram(Request $request, ?Program $program = null): array
    {
        $scopedId = $this->scopedBranchId();
        $programNameOptions = $this->programNameOptions();

        $rules = [
            'branch_id' => [
                'required',
                'integer',
                Rule::exists('branch', 'id')->where(fn ($query) => $query->where('is_deleted', 0)),
            ],
            'name' => ['required', 'string', 'max:150', Rule::in($programNameOptions)],
            'duration_years' => ['required', 'integer', 'min:1'],
            'chair_teacher_id' => [
                'nullable',
                'integer',
                Rule::exists('teacher', 'id')->where(fn ($query) => $query->where('is_deleted', 0)->where('is_activated', 1)),
            ],
            'is_activated' => ['boolean'],
        ];

        $validated = $request->validate($rules);

        if ($scopedId !== null) {
            $validated['branch_id'] = $scopedId;
        }

        $department = Department::query()
            ->where('branch_id', $validated['branch_id'])
            ->where('is_deleted', 0)
            ->where(function ($query) {
                $query->where('name', 'like', '%College%')
                    ->orWhere('code', 'like', '%COL%');
            })
            ->orderBy('id')
            ->firstOrFail();

        $validated['department_id'] = $department->id;

        if ((int) $department->branch_id !== (int) $validated['branch_id']) {
            abort(422, 'The selected department does not belong to the selected branch.');
        }

        if (! empty($validated['chair_teacher_id'])) {
            $teacher = Teacher::query()
                ->where('id', $validated['chair_teacher_id'])
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->firstOrFail();

            if ((int) $teacher->branch_id !== (int) $validated['branch_id'] || (int) $teacher->department_id !== (int) $validated['department_id']) {
                abort(422, 'The selected chair must match the chosen branch and department.');
            }
        }

        return $validated;
    }

    private function programNameOptions(): array
    {
        return Program::query()
            ->where('is_deleted', 0)
            ->pluck('name')
            ->filter()
            ->merge(self::BASE_PROGRAM_NAME_OPTIONS)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function syncAssignedChair(Program $program, ?int $chairTeacherId): void
    {
        Teacher::query()
            ->where('program_id', $program->id)
            ->where('is_deleted', 0)
            ->update(['program_id' => null]);

        if ($chairTeacherId === null) {
            return;
        }

        Teacher::query()
            ->where('id', $chairTeacherId)
            ->update([
                'program_id' => $program->id,
                'department_id' => $program->department_id,
                'role' => 'Program Chair',
            ]);
    }

    private function generateProgramCode(string $name, int $branchId, ?int $ignoreId = null): string
    {
        $branchCode = Branch::query()->where('id', $branchId)->value('code') ?: 'BR';
        $initials = collect(preg_split('/\s+/', trim($name)) ?: [])
            ->reject(fn ($word) => $word === '' || in_array(strtolower($word), ['of', 'in', 'and', 'the']))
            ->map(fn ($word) => strtoupper(substr($word, 0, 1)))
            ->join('');

        $base = substr($initials ?: 'PRG', 0, 8) . '-' . strtoupper($branchCode);
        $code = $base;
        $suffix = 2;

        while (
            Program::query()
                ->where('code', $code)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $code = $base . '-' . $suffix;
            $suffix++;
        }

        return $code;
    }
}
