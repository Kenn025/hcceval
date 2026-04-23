<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Program;
use App\Models\Strand;
use App\Models\Student;
use App\Models\YearLevel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $search   = $request->input('search', '');
        $scopedId = $this->scopedBranchId();
        $branchId = $scopedId ?? $request->input('branch_id');

        $students = Student::query()
            ->with(['branch:id,name', 'department:id,name', 'program:id,name', 'yearLevel:id,name'])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('student_no', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->orderBy('last_name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Students', [
            'students'    => $students,
            'filters'     => ['search' => $search, 'branch_id' => $branchId],
            'branches'    => $scopedId ? [] : Branch::select('id', 'name')->orderBy('name')->get(),
            'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            'programs'    => Program::select('id', 'name')->orderBy('name')->get(),
            'strands'     => Strand::select('id', 'name')->orderBy('name')->get(),
            'yearLevels'  => YearLevel::select('id', 'name')->orderBy('name')->get(),
            'isBranchAdmin' => $this->isBranchAdmin(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'student_no' => 'required|string|max:50|unique:students,student_no',
            'branch_id' => 'required|exists:branches,id',
            'department_id' => 'required|exists:departments,id',
            'program_id' => 'nullable|exists:programs,id',
            'strand_id' => 'nullable|exists:strands,id',
            'year_level_id' => 'nullable|exists:year_levels,id',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'suffix_name' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150|unique:students,email',
            'password' => 'nullable|string|min:6',
            'status' => 'nullable|string|max:50',
        ]);

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            $validated['password'] = Hash::make('hcc1234');
        }

        Student::create($validated);

        return back()->with('success', 'Student created successfully.');
    }

    public function update(Request $request, Student $student)
    {
        $validated = $request->validate([
            'student_no' => "required|string|max:50|unique:students,student_no,{$student->id}",
            'branch_id' => 'required|exists:branches,id',
            'department_id' => 'required|exists:departments,id',
            'program_id' => 'nullable|exists:programs,id',
            'strand_id' => 'nullable|exists:strands,id',
            'year_level_id' => 'nullable|exists:year_levels,id',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'suffix_name' => 'nullable|string|max:50',
            'email' => "nullable|email|max:150|unique:students,email,{$student->id}",
            'password' => 'nullable|string|min:6',
            'status' => 'nullable|string|max:50',
        ]);

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $student->update($validated);

        return back()->with('success', 'Student updated successfully.');
    }

    public function destroy(Student $student)
    {
        $student->delete();

        return back()->with('success', 'Student deleted.');
    }
}
