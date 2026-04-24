<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Strand;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class StrandController extends Controller
{
    private const BASE_STRAND_NAME_OPTIONS = [
        'Science, Technology, Engineering and Mathematics',
        'Accountancy, Business and Management',
        'Humanities and Social Sciences',
        'General Academic Strand',
        'Technical-Vocational-Livelihood',
    ];

    public function index(Request $request)
    {
        $search = $request->input('search', '');
        $scopedId = $this->scopedBranchId();
        $requestedBranchId = $request->integer('branch_id');

        $branches = Branch::query()
            ->select('id', 'name', 'code')
            ->where('is_deleted', 0)
            ->where('code', '!=', 'OVERALL')
            ->when($scopedId, fn ($q) => $q->where('id', $scopedId))
            ->orderBy('name')
            ->get();

        $selectedBranchId = $scopedId
            ?? ($branches->contains('id', $requestedBranchId) ? $requestedBranchId : $branches->first()?->id);

        $strands = Strand::query()
            ->with(['department:id,name,branch_id', 'department.branch:id,name', 'assignedAdviser:id,strand_id,firstname,middlename,lastname'])
            ->where('is_deleted', 0)
            ->when($selectedBranchId, fn ($q) => $q->whereHas('department', fn ($department) => $department->where('branch_id', $selectedBranchId)))
            ->when($search, function ($q) use ($search) {
                $q->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $strands->getCollection()->transform(function (Strand $strand) {
            $strand->assigned_adviser_name = $strand->assignedAdviser?->full_name;

            return $strand;
        });

        $advisers = Teacher::query()
            ->select('id', 'branch_id', 'department_id', 'strand_id', 'firstname', 'middlename', 'lastname')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($selectedBranchId, fn ($q) => $q->where('branch_id', $selectedBranchId))
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->get()
            ->map(fn (Teacher $teacher) => [
                'id' => $teacher->id,
                'branch_id' => $teacher->branch_id,
                'department_id' => $teacher->department_id,
                'strand_id' => $teacher->strand_id,
                'full_name' => $teacher->full_name,
            ]);

        return Inertia::render('Admin/Strands', [
            'strands' => $strands,
            'filters' => ['search' => $search, 'branch_id' => $selectedBranchId],
            'branches' => $branches,
            'selectedBranchId' => $selectedBranchId,
            'scopedBranchId' => $scopedId,
            'advisers' => $advisers,
            'strandNameOptions' => $this->strandNameOptions(),
            'departments' => Department::query()
                ->select('id', 'name', 'branch_id')
                ->where('is_deleted', 0)
                ->when($selectedBranchId, fn ($q) => $q->where('branch_id', $selectedBranchId))
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateStrand($request);
        $validated['code'] = $this->generateStrandCode($validated['name'], $validated['branch_id']);

        $strand = Strand::create($validated);
        $this->syncAssignedAdviser($strand, $request->integer('adviser_teacher_id') ?: null);

        return back()->with('success', 'Strand created successfully.');
    }

    public function update(Request $request, Strand $strand)
    {
        $validated = $this->validateStrand($request, $strand);
        $validated['code'] = $strand->code ?: $this->generateStrandCode($validated['name'], $validated['branch_id'], $strand->id);

        $strand->update($validated);
        $this->syncAssignedAdviser($strand, $request->integer('adviser_teacher_id') ?: null);

        return back()->with('success', 'Strand updated successfully.');
    }

    public function destroy(Strand $strand)
    {
        $strand->update(['is_deleted' => 1]);

        return back()->with('success', 'Strand deleted.');
    }

    private function validateStrand(Request $request, ?Strand $strand = null): array
    {
        $scopedId = $this->scopedBranchId();
        $validated = $request->validate([
            'branch_id' => [
                'required',
                'integer',
                Rule::exists('branch', 'id')->where(fn ($query) => $query->where('is_deleted', 0)),
            ],
            'name' => ['required', 'string', 'max:150', Rule::in($this->strandNameOptions())],
            'adviser_teacher_id' => [
                'nullable',
                'integer',
                Rule::exists('teacher', 'id')->where(fn ($query) => $query->where('is_deleted', 0)->where('is_activated', 1)),
            ],
            'is_activated' => ['boolean'],
        ]);

        if ($scopedId !== null) {
            $validated['branch_id'] = $scopedId;
        }

        $department = Department::query()
            ->where('branch_id', $validated['branch_id'])
            ->where('is_deleted', 0)
            ->where(function ($query) {
                $query->where('name', 'like', '%Senior High%')
                    ->orWhere('code', 'like', '%SHS%');
            })
            ->orderBy('id')
            ->firstOrFail();

        $validated['department_id'] = $department->id;

        if ((int) $department->branch_id !== (int) $validated['branch_id']) {
            abort(422, 'The selected department does not belong to the selected branch.');
        }

        if (! empty($validated['adviser_teacher_id'])) {
            $adviser = Teacher::query()
                ->where('id', $validated['adviser_teacher_id'])
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->firstOrFail();

            if ((int) $adviser->branch_id !== (int) $validated['branch_id'] || (int) $adviser->department_id !== (int) $validated['department_id']) {
                abort(422, 'The selected adviser must match the chosen branch and department.');
            }
        }

        $validated['branch_id'] = (int) $validated['branch_id'];
        $validated['is_deleted'] = 0;

        return $validated;
    }

    private function strandNameOptions(): array
    {
        return Strand::query()
            ->where('is_deleted', 0)
            ->pluck('name')
            ->filter()
            ->merge(self::BASE_STRAND_NAME_OPTIONS)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function syncAssignedAdviser(Strand $strand, ?int $adviserTeacherId): void
    {
        Teacher::query()
            ->where('strand_id', $strand->id)
            ->where('is_deleted', 0)
            ->update(['strand_id' => null]);

        if ($adviserTeacherId === null) {
            return;
        }

        Teacher::query()
            ->where('id', $adviserTeacherId)
            ->update([
                'department_id' => $strand->department_id,
                'strand_id' => $strand->id,
                'role' => 'Adviser',
            ]);
    }

    private function generateStrandCode(string $name, int $branchId, ?int $ignoreId = null): string
    {
        $branchCode = Branch::query()->where('id', $branchId)->value('code') ?: 'BR';
        $initials = collect(preg_split('/\s+/', trim($name)) ?: [])
            ->reject(fn ($word) => $word === '' || in_array(strtolower($word), ['and', 'of', 'the']))
            ->map(fn ($word) => strtoupper(substr($word, 0, 1)))
            ->join('');

        $base = substr($initials ?: 'STR', 0, 8) . '-' . strtoupper($branchCode);
        $code = $base;
        $suffix = 2;

        while (
            Strand::query()
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
