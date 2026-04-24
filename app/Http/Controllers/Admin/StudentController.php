<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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

        $students = Student::query()
            ->with(['branch:id,name', 'department:id,name', 'program:id,name', 'yearLevel:id,year_level,section'])
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

        return Inertia::render('Admin/Students', [
            'students'    => $students,
            'filters'     => ['search' => $search, 'branch_id' => $branchId],
            'branches'    => $scopedId ? [] : Branch::query()
                ->select('id', 'name')
                ->where('is_deleted', 0)
                ->where('code', '!=', 'OVERALL')
                ->orderBy('name')
                ->get(),
            'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            'programs'    => Program::select('id', 'name')->orderBy('name')->get(),
            'strands'     => Strand::select('id', 'name')->orderBy('name')->get(),
            'yearLevels'  => EducationLevel::query()
                ->selectRaw("id, CONCAT(year_level, ' - ', section) as name")
                ->where('is_deleted', 0)
                ->orderBy('year_level')
                ->orderBy('section')
                ->get(),
            'isBranchAdmin' => $this->isBranchAdmin(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'student_no' => 'required|string|max:50|unique:student,code',
            'branch_id' => 'required|exists:branch,id',
            'department_id' => 'required|exists:department,id',
            'program_id' => 'nullable|exists:program,id',
            'strand_id' => 'nullable|exists:strand,id',
            'year_level_id' => 'nullable|exists:education_level,id',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'suffix_name' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150|unique:student,email',
            'password' => 'nullable|string|min:6',
            'status' => 'nullable|string|max:50',
        ]);

        Student::create($this->mapStudentPayload($validated));

        return back()->with('success', 'Student created successfully.');
    }

    public function update(Request $request, Student $student)
    {
        $validated = $request->validate([
            'student_no' => "required|string|max:50|unique:student,code,{$student->id}",
            'branch_id' => 'required|exists:branch,id',
            'department_id' => 'required|exists:department,id',
            'program_id' => 'nullable|exists:program,id',
            'strand_id' => 'nullable|exists:strand,id',
            'year_level_id' => 'nullable|exists:education_level,id',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'suffix_name' => 'nullable|string|max:50',
            'email' => "nullable|email|max:150|unique:student,email,{$student->id}",
            'password' => 'nullable|string|min:6',
            'status' => 'nullable|string|max:50',
        ]);

        $student->update($this->mapStudentPayload($validated, false));

        return back()->with('success', 'Student updated successfully.');
    }

    public function destroy(Student $student)
    {
        $student->update(['is_deleted' => 1]);

        return back()->with('success', 'Student deleted.');
    }

    protected function mapStudentPayload(array $validated, bool $includeDefaultPassword = true): array
    {
        $payload = [
            'code' => $validated['student_no'],
            'branch_id' => $validated['branch_id'],
            'department_id' => $validated['department_id'],
            'program_id' => $validated['program_id'] ?: null,
            'strand_id' => $validated['strand_id'] ?: null,
            'education_level_id' => $validated['year_level_id'] ?: null,
            'firstname' => $validated['first_name'],
            'middlename' => $validated['middle_name'] ?: null,
            'lastname' => $validated['last_name'],
            'email' => $validated['email'] ?: null,
            'is_activated' => ($validated['status'] ?? 'active') === 'active',
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
