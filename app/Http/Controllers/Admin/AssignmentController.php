<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AssignmentController extends Controller
{
    private const TYPE_CODE_MAP = [
        'student-teacher' => 'QTYPE-SUBJECT',
        'peer' => 'QTYPE-PEER',
        'head' => 'QTYPE-HEAD',
        'employee' => 'QTYPE-EMPLOYEE',
    ];

    private function baseQuery(?string $search = '')
    {
        $search = $search ?? '';

        return DB::table('questionnaire_distribution as qd')
            ->leftJoin('questionnaires as q', 'qd.questionnaire_id', '=', 'q.id')
            ->leftJoin('questionnaire_type as qt', 'q.questionnaire_type_id', '=', 'qt.id')
            ->leftJoin('academic_year as ay', 'qd.academic_year_id', '=', 'ay.id')
            ->select(
                'qd.id as distribution_id',
                'qd.code as distribution_code',
                'q.title as questionnaire_title',
                'qt.name as questionnaire_type_name',
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year"),
                'ay.term as semester',
                'qd.items',
                'qd.is_activated'
            )
            ->when($search, fn ($query) => $query->where(function ($sub) use ($search) {
                $sub->where('qd.code', 'like', "%{$search}%")
                    ->orWhere('q.code', 'like', "%{$search}%")
                    ->orWhere('q.title', 'like', "%{$search}%")
                    ->orWhere('qt.name', 'like', "%{$search}%");
            }))
            ->where('qd.is_deleted', 0);
    }

    private function renderAssignmentsPage(Request $request, string $assignmentType)
    {
        $search = (string) ($request->input('search') ?? '');
        $typeCode = self::TYPE_CODE_MAP[$assignmentType] ?? self::TYPE_CODE_MAP['student-teacher'];

        $assignments = $this->baseQuery($search)
            ->where('qt.code', $typeCode)
            ->orderByDesc('qd.id')
            ->paginate(15)
            ->withQueryString();

        $questionnaires = DB::table('questionnaires as q')
            ->leftJoin('questionnaire_type as qt', 'q.questionnaire_type_id', '=', 'qt.id')
            ->select('q.id as questionnaire_id', 'q.title')
            ->where('q.is_deleted', 0)
            ->where('qt.code', $typeCode)
            ->orderBy('q.title')
            ->get();

        return Inertia::render('Admin/Assignments', [
            'assignments'    => $assignments,
            'assignmentType' => $assignmentType,
            'filters'        => ['search' => $search],
            'questionnaires' => $questionnaires,
            'subjects'       => [],
        ]);
    }

    public function index(Request $request)
    {
        return $this->renderAssignmentsPage($request, 'student-teacher');
    }

    public function subjectAssignments(Request $request)
    {
        return $this->renderAssignmentsPage($request, 'student-teacher');
    }

    public function peerAssignments(Request $request)
    {
        return $this->renderAssignmentsPage($request, 'peer');
    }

    public function headAssignments(Request $request)
    {
        return $this->renderAssignmentsPage($request, 'head');
    }

    public function employeeAssignments(Request $request)
    {
        return $this->renderAssignmentsPage($request, 'employee');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'questionnaire_id'  => 'required|integer',
            'academic_year_id'  => 'nullable|integer',
        ]);

        $count = DB::table('questionnaire_distribution')->count() + 1;

        DB::table('questionnaire_distribution')->insert([
            'code'             => 'QD-' . str_pad($count, 3, '0', STR_PAD_LEFT),
            'questionnaire_id' => $validated['questionnaire_id'],
            'academic_year_id' => $validated['academic_year_id'] ?? null,
            'items'            => '[]',
            'is_activated'     => 1,
            'is_deleted'       => 0,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        return back()->with('success', 'Assignment created.');
    }

    public function destroy(int $id)
    {
        DB::table('questionnaire_distribution')->where('id', $id)->update(['is_deleted' => 1, 'updated_at' => now()]);
        return back()->with('success', 'Assignment removed.');
    }
}
