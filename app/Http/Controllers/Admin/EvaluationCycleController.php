<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class EvaluationCycleController extends Controller
{
    public function index()
    {
        $cycles = DB::table('academic_year')
            ->select(
                'id as year_id',
                'from_year as year_start',
                'to_year as year_end',
                'term as semester',
                DB::raw("CONCAT(from_year, '-', to_year) as school_year"),
                DB::raw("CASE WHEN is_deleted = 1 THEN 'closed' WHEN is_activated = 1 THEN 'active' ELSE 'inactive' END as status")
            )
            ->orderByDesc('from_year')
            ->get();

        $activeCycle = $cycles->firstWhere('status', 'active');

        return Inertia::render('Admin/EvaluationCycle', [
            'cycles'      => $cycles,
            'activeCycle' => $activeCycle,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'school_year' => 'nullable|string|max:20',
            'semester'    => 'required|string|max:50',
            'year_start'  => 'required|integer|min:2000',
            'year_end'    => 'required|integer|min:2000',
            'status'      => 'required|in:active,inactive,closed',
        ]);

        if ($validated['status'] === 'active') {
            DB::table('academic_year')->update(['is_activated' => 0]);
        }

        DB::table('academic_year')->insert([
            'from_year'    => $validated['year_start'],
            'to_year'      => $validated['year_end'],
            'term'         => $validated['semester'],
            'is_activated' => $validated['status'] === 'active' ? 1 : 0,
            'is_deleted'   => $validated['status'] === 'closed' ? 1 : 0,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        return back()->with('success', 'Evaluation cycle created.');
    }

    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'school_year' => 'nullable|string|max:20',
            'semester'    => 'required|string|max:50',
            'year_start'  => 'required|integer|min:2000',
            'year_end'    => 'required|integer|min:2000',
            'status'      => 'required|in:active,inactive,closed',
        ]);

        if ($validated['status'] === 'active') {
            DB::table('academic_year')->where('id', '!=', $id)->update(['is_activated' => 0]);
        }

        DB::table('academic_year')->where('id', $id)->update([
            'from_year'    => $validated['year_start'],
            'to_year'      => $validated['year_end'],
            'term'         => $validated['semester'],
            'is_activated' => $validated['status'] === 'active' ? 1 : 0,
            'is_deleted'   => $validated['status'] === 'closed' ? 1 : 0,
            'updated_at'   => now(),
        ]);

        return back()->with('success', 'Evaluation cycle updated.');
    }

    public function destroy(int $id)
    {
        DB::table('academic_year')->where('id', $id)->delete();
        return back()->with('success', 'Evaluation cycle deleted.');
    }
}
