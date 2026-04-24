<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Program;
use App\Models\Strand;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SubjectController extends Controller
{
    public function index(Request $request, string $educationType = 'college')
    {
        $search = $request->input('search', '');
        $scopedId = $this->scopedBranchId();
        $requestedBranchId = $request->integer('branch_id');

        $typeMap = [
            'college' => 'college',
            'senior-high' => 'shs',
            'junior-high' => 'jhs',
            'grade-school' => 'elementary',
        ];

        $subjectType = $typeMap[$educationType] ?? 'college';
        $branches = Branch::query()
            ->select('id', 'name', 'code')
            ->where('is_deleted', 0)
            ->where('code', '!=', 'OVERALL')
            ->when($scopedId, fn ($q) => $q->where('id', $scopedId))
            ->orderBy('name')
            ->get();

        $selectedBranchId = $scopedId
            ?? ($branches->contains('id', $requestedBranchId) ? $requestedBranchId : $branches->first()?->id);

        $subjects = Subject::query()
            ->with(['department:id,name', 'program:id,name', 'strand:id,name'])
            ->where('is_deleted', 0)
            ->where('type', $subjectType)
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

        $titleMap = [
            'college' => 'College',
            'senior-high' => 'Senior High',
            'junior-high' => 'Junior High',
            'grade-school' => 'Grade School',
        ];

        return Inertia::render('Admin/Subjects', [
            'subjects' => $subjects,
            'filters' => ['search' => $search, 'branch_id' => $selectedBranchId],
            'educationType' => $educationType,
            'educationLevelName' => $titleMap[$educationType] ?? 'College',
            'subjectType' => $subjectType,
            'branches' => $branches,
            'selectedBranchId' => $selectedBranchId,
            'scopedBranchId' => $scopedId,
            'departments' => Department::query()->select('id', 'name', 'branch_id')->where('is_deleted', 0)->when($selectedBranchId, fn ($q) => $q->where('branch_id', $selectedBranchId))->orderBy('name')->get(),
            'programs' => Program::query()->select('id', 'name', 'department_id')->where('is_deleted', 0)->whereHas('department', fn ($q) => $q->when($selectedBranchId, fn ($branchQuery) => $branchQuery->where('branch_id', $selectedBranchId)))->orderBy('name')->get(),
            'strands' => Strand::query()->select('id', 'name', 'department_id')->where('is_deleted', 0)->whereHas('department', fn ($q) => $q->when($selectedBranchId, fn ($branchQuery) => $branchQuery->where('branch_id', $selectedBranchId)))->orderBy('name')->get(),
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
        ]);

        if ($scopedId !== null) {
            $validated['branch_id'] = $scopedId;
        }

        if ($validated['type'] === 'college') {
            if (empty($validated['program_id'])) {
                abort(422, 'The selected program is required.');
            }

            $program = Program::query()
                ->where('id', $validated['program_id'])
                ->where('is_deleted', 0)
                ->firstOrFail();

            $validated['department_id'] = $program->department_id;
            $validated['strand_id'] = null;
        } else {
            $validated['program_id'] = null;

            if (! empty($validated['strand_id'])) {
                $strand = Strand::query()
                    ->where('id', $validated['strand_id'])
                    ->where('is_deleted', 0)
                    ->firstOrFail();

                $validated['department_id'] = $strand->department_id;
            } else {
                $validated['department_id'] = $this->resolveDepartmentIdForBranchAndType((int) $validated['branch_id'], $validated['type']);
            }
        }

        $department = Department::query()
            ->where('id', $validated['department_id'])
            ->where('is_deleted', 0)
            ->firstOrFail();

        if ((int) $department->branch_id !== (int) $validated['branch_id']) {
            abort(422, 'The selected department does not belong to the selected branch.');
        }

        unset($validated['branch_id']);
        $validated['is_deleted'] = 0;

        return $validated;
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

    private function resolveDepartmentIdForBranchAndType(int $branchId, string $type): int
    {
        $department = Department::query()
            ->where('branch_id', $branchId)
            ->where('is_deleted', 0)
            ->where(function ($query) use ($type) {
                match ($type) {
                    'shs' => $query->where('name', 'like', '%Senior High%')->orWhere('code', 'like', '%SHS%'),
                    'jhs' => $query->where('name', 'like', '%Junior High%')->orWhere('code', 'like', '%JHS%'),
                    'elementary' => $query->where('name', 'like', '%Elementary%')->orWhere('code', 'like', '%ELEM%'),
                    default => $query->whereRaw('1 = 0'),
                };
            })
            ->orderBy('id')
            ->first();

        if (! $department) {
            abort(422, 'No matching department was found for the selected branch.');
        }

        return (int) $department->id;
    }
}
