<?php

namespace App\Http\Controllers;

use App\Models\BugReport;
use Illuminate\Http\Request;

class BugReportController extends Controller
{
    /**
     * Store a bug report from any authenticated portal user or admin.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject'     => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'severity'    => 'required|in:low,medium,high,critical',
        ]);

        // Determine reporter identity from the session/request
        $reporterType = $request->input('reporter_type', 'unknown');
        $reporterId   = $request->input('reporter_id', 0);
        $reporterName = $request->input('reporter_name', 'Unknown');

        BugReport::create([
            'reporter_type' => $reporterType,
            'reporter_id'   => $reporterId,
            'reporter_name' => $reporterName,
            'subject'       => $validated['subject'],
            'description'   => $validated['description'],
            'severity'      => $validated['severity'],
        ]);

        return back()->with('success', 'Bug report submitted successfully. Thank you!');
    }
}
