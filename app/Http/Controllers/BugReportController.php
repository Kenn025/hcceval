<?php

namespace App\Http\Controllers;

use App\Models\BugReport;
use App\Services\AppNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BugReportController extends Controller
{
    /**
     * Store a bug report from any authenticated portal user or admin.
     */
    public function store(Request $request)
    {
        if (! Schema::hasTable('bug_reports')) {
            return back()->withErrors([
                'bug_report' => 'Bug reports table is not ready yet. Please run migrations first.',
            ]);
        }

        $validated = $request->validate([
            'subject'     => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'severity'    => 'required|in:low,medium,high,critical',
        ]);

        [$reporterType, $reporterId, $reporterName] = $this->resolveReporterIdentity($request);

        BugReport::create([
            'reporter_type' => $reporterType,
            'reporter_id'   => $reporterId,
            'reporter_name' => $reporterName,
            'subject'       => $validated['subject'],
            'description'   => $validated['description'],
            'severity'      => $validated['severity'],
            'status'        => 'new',
        ]);

        $this->notifySuperAdminsNewBug(
            $reporterName,
            $validated['subject'],
            $validated['severity'],
        );

        return back();
    }

    private function resolveReporterIdentity(Request $request): array
    {
        if (session('admin_id')) {
            $adminId = (int) session('admin_id');
            $adminName = (string) (auth()->user()?->name ?? $request->input('reporter_name', 'Admin'));

            return ['admin', $adminId, $adminName !== '' ? $adminName : 'Admin'];
        }

        $clientSource = strtolower((string) session('client_source', ''));
        $clientId = (int) session('client_id', 0);
        $clientName = (string) session('client_name', '');

        if (in_array($clientSource, ['student', 'teacher', 'employee'], true) && $clientId > 0) {
            return [$clientSource, $clientId, $clientName !== '' ? $clientName : 'User'];
        }

        $fallbackType = strtolower((string) $request->input('reporter_type', 'unknown'));
        $fallbackId = (int) $request->input('reporter_id', 0);
        $fallbackName = (string) $request->input('reporter_name', 'Unknown');

        // When legacy admin session keys are missing, map authenticated user email
        // back to the legacy admin row so bug resolutions can notify correctly.
        if ($fallbackType === 'admin' && $fallbackId > 0 && Schema::hasTable('admin')) {
            $authEmail = auth()->user()?->email;
            if ($authEmail) {
                $adminIdByEmail = DB::table('admin')
                    ->where('email', $authEmail)
                    ->where('is_deleted', 0)
                    ->value('id');

                if ($adminIdByEmail) {
                    return ['admin', (int) $adminIdByEmail, $fallbackName !== '' ? $fallbackName : 'Admin'];
                }
            }
        }

        return [$fallbackType, $fallbackId, $fallbackName !== '' ? $fallbackName : 'Unknown'];
    }

    private function notifySuperAdminsNewBug(string $reporterName, string $subject, string $severity): void
    {
        if (! Schema::hasTable('admin')) {
            return;
        }

        $superAdmins = DB::table('admin')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->where('role', 'superadmin')
            ->select('id', 'email')
            ->get();

        foreach ($superAdmins as $admin) {
            AppNotifier::record(
                'admin',
                (int) $admin->id,
                $admin->email ?: null,
                'bug.reported',
                'New bug report submitted',
                sprintf(
                    '%s submitted a %s bug report: "%s".',
                    $reporterName !== '' ? $reporterName : 'A user',
                    strtoupper($severity),
                    $subject,
                ),
                url('/admin/bug-reports'),
            );
        }
    }
}
