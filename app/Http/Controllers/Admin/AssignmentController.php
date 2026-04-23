<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AssignmentController extends Controller
{
    private function baseQuery(string $search = '')
    {
        return DB::table('questionnaire_distribution as qd')
            ->leftJoin('questionnaires as q', 'qd.questionnaire_id', '=', 'q.id')
            ->leftJoin('academic_year as ay', 'qd.academic_year_id', '=', 'ay.id')
            ->select(
                'qd.id as distribution_id',
                'q.code as questionnaire_title',
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year"),
                'ay.term as semester',
                'qd.items',
                'qd.is_activated'
            )
            ->when($search, fn ($query) => $query->where('q.code', 'like', "%{$search}%"))
            ->where('qd.is_deleted', 0);
    }

    public function subjectAssignments(Request $request)
    {
        $search = $request->input('search', '');

        $assignments = $this->baseQuery($search)
            ->orderByDesc('qd.id')
            ->paginate(15)
            ->withQueryString();

        $questionnaires = DB::table('questionnaires')->select('id as questionnaire_id', 'code as title')->where('is_deleted', 0)->get();

        return Inertia::render('Admin/Assignments', [
            'assignments'    => $assignments,
            'assignmentType' => 'subject',
            'filters'        => ['search' => $search],
            'questionnaires' => $questionnaires,
            'subjects'       => [],
        ]);
    }

    public function peerAssignments(Request $request)
    {
        $search = $request->input('search', '');

        $assignments = $this->baseQuery($search)
            ->orderByDesc('qd.id')
            ->paginate(15)
            ->withQueryString();

        $questionnaires = DB::table('questionnaires')->select('id as questionnaire_id', 'code as title')->where('is_deleted', 0)->get();

        return Inertia::render('Admin/Assignments', [
            'assignments'    => $assignments,
            'assignmentType' => 'peer',
            'filters'        => ['search' => $search],
            'questionnaires' => $questionnaires,
        ]);
    }

    public function employeeAssignments(Request $request)
    {
        $search = $request->input('search', '');

        $assignments = $this->baseQuery($search)
            ->orderByDesc('qd.id')
            ->paginate(15)
            ->withQueryString();

        $questionnaires = DB::table('questionnaires')->select('id as questionnaire_id', 'code as title')->where('is_deleted', 0)->get();

        return Inertia::render('Admin/Assignments', [
            'assignments'    => $assignments,
            'assignmentType' => 'employee',
            'filters'        => ['search' => $search],
            'questionnaires' => $questionnaires,
        ]);
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
