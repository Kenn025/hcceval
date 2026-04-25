<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\EvaluationCycleRequest;
use App\Services\AuditLogger;
use App\Services\EvaluationNotifier;
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
            ->orderBy('from_year')
            ->orderBy('id')
            ->get();

        $activeCycle = $cycles->firstWhere('status', 'active');

        return Inertia::render('Admin/EvaluationCycle', [
            'cycles'      => $cycles,
            'activeCycle' => $activeCycle,
        ]);
    }

    public function store(EvaluationCycleRequest $request, EvaluationNotifier $notifier)
    {
        $validated = $request->validated();

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

        if ($validated['status'] === 'active') {
            $notifier->windowOpened(
                "{$validated['year_start']}-{$validated['year_end']}",
                $validated['semester'],
                $this->scopedBranchId(),
            );
        }

        AuditLogger::record('evaluation_cycle.created', 'academic_year', null, $validated);

        return back()->with('success', 'Evaluation cycle created.');
    }

    public function update(EvaluationCycleRequest $request, int $id, EvaluationNotifier $notifier)
    {
        $validated = $request->validated();

        $previous = DB::table('academic_year')->where('id', $id)->first();

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

        $yearLabel = "{$validated['year_start']}-{$validated['year_end']}";
        $branch    = $this->scopedBranchId();

        if ($previous && ! $previous->is_activated && $validated['status'] === 'active') {
            $notifier->windowOpened($yearLabel, $validated['semester'], $branch);
        } elseif ($previous && $previous->is_activated && $validated['status'] !== 'active') {
            $notifier->windowClosed($yearLabel, $validated['semester'], $branch);
        }

        AuditLogger::record('evaluation_cycle.updated', 'academic_year', $id, $validated);

        return back()->with('success', 'Evaluation cycle updated.');
    }

    public function destroy(int $id, EvaluationNotifier $notifier)
    {
        $cycle = DB::table('academic_year')->where('id', $id)->first();

        DB::table('academic_year')->where('id', $id)->update([
            'is_deleted' => 1,
            'is_activated' => 0,
            'updated_at' => now(),
        ]);

        if ($cycle && $cycle->is_activated) {
            $notifier->windowClosed(
                "{$cycle->from_year}-{$cycle->to_year}",
                $cycle->term,
                $this->scopedBranchId(),
            );
        }

        AuditLogger::record('evaluation_cycle.deleted', 'academic_year', $id);

        return back()->with('success', 'Evaluation cycle deleted.');
    }
}
