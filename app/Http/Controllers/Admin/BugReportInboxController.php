<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BugReport;
use App\Services\AppNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class BugReportInboxController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $severity = strtolower(trim((string) $request->input('severity', 'all')));
        $severity = in_array($severity, ['all', 'low', 'medium', 'high', 'critical'], true) ? $severity : 'all';
        $view = strtolower(trim((string) $request->input('view', 'open')));
        $view = in_array($view, ['open', 'resolved'], true) ? $view : 'open';
        $perPage = $request->integer('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100], true) ? $perPage : 15;

        if (! Schema::hasTable('bug_reports')) {
            return Inertia::render('Admin/BugReports', [
                'reports' => [
                    'data' => [],
                    'links' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $perPage,
                    'total' => 0,
                    'from' => null,
                    'to' => null,
                ],
                'filters' => [
                    'search' => $search,
                    'severity' => $severity,
                    'view' => $view,
                    'per_page' => $perPage,
                ],
                'tableMissing' => true,
            ]);
        }

        $applyFilters = function ($query) use ($search, $severity) {
            $query
                ->when($search !== '', function ($subQuery) use ($search) {
                    $subQuery->where(function ($inner) use ($search) {
                        $inner->where('subject', 'like', "%{$search}%")
                            ->orWhere('description', 'like', "%{$search}%")
                            ->orWhere('reporter_name', 'like', "%{$search}%")
                            ->orWhere('reporter_type', 'like', "%{$search}%")
                            ->orWhere('severity', 'like', "%{$search}%")
                            ->orWhere('status', 'like', "%{$search}%");
                    });
                })
                ->when($severity !== 'all', function ($subQuery) use ($severity) {
                    $subQuery->where('severity', $severity);
                });
        };

        $reports = BugReport::query()
            ->when($view === 'resolved', function ($query) {
                $query->where('status', 'resolved');
            }, function ($query) {
                $query->where('status', '!=', 'resolved');
            })
            ->tap($applyFilters)
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Admin/BugReports', [
            'reports' => $reports,
            'filters' => [
                'search' => $search,
                'severity' => $severity,
                'view' => $view,
                'per_page' => $perPage,
            ],
            'tableMissing' => false,
        ]);
    }

    public function resolve(BugReport $bugReport)
    {
        if (! Schema::hasTable('bug_reports')) {
            return back()->withErrors([
                'bug_reports' => 'Bug reports table is missing. Please run migrations first.',
            ]);
        }

        if ((string) $bugReport->status !== 'resolved') {
            $bugReport->update([
                'status' => 'resolved',
                'resolved_at' => now(),
            ]);

            $resolverName = auth()->user()?->name ?? 'Admin';
            $this->notifyReporterResolved($bugReport, $resolverName);
        }

        return back()->with('success', 'Bug report marked as resolved.');
    }

    private function notifyReporterResolved(BugReport $bugReport, string $resolverName): void
    {
        $recipientType = strtolower((string) $bugReport->reporter_type);
        $recipientId = (int) $bugReport->reporter_id;

        if (! in_array($recipientType, ['admin', 'student', 'teacher', 'employee'], true)) {
            return;
        }

        if (! Schema::hasTable($recipientType)) {
            return;
        }

        $recipient = null;
        if ($recipientId > 0) {
            $recipient = DB::table($recipientType)
                ->where('id', $recipientId)
                ->select('id', 'email')
                ->first();
        }

        // Backward-compatibility for older bug rows with incorrect admin reporter_id.
        if (! $recipient && $recipientType === 'admin') {
            // Case 1: reporter_id might actually be users.id, map users.email -> admin.email
            if (Schema::hasTable('users')) {
                $userEmail = DB::table('users')
                    ->where('id', $recipientId)
                    ->value('email');

                if ($userEmail) {
                    $recipient = DB::table('admin')
                        ->where('email', $userEmail)
                        ->where('is_deleted', 0)
                        ->select('id', 'email')
                        ->first();
                }
            }

            // Case 2: fallback by reporter_name text
            if (! $recipient) {
                $recipient = DB::table('admin')
                    ->where('name', (string) $bugReport->reporter_name)
                    ->where('is_deleted', 0)
                    ->select('id', 'email')
                    ->first();
            }
        }

        if (! $recipient) {
            return;
        }

        AppNotifier::record(
            $recipientType,
            (int) $recipient->id,
            $recipient->email ?: null,
            'bug.resolved',
            'Bug report resolved',
            sprintf(
                'Your bug report "%s" has been marked as resolved by %s.',
                (string) $bugReport->subject,
                $resolverName,
            ),
            $this->actionUrlForRecipientType($recipientType),
        );
    }

    private function actionUrlForRecipientType(string $recipientType): ?string
    {
        return match ($recipientType) {
            'admin' => url('/dashboard'),
            'student' => url('/portal/student'),
            'teacher' => url('/portal/teacher'),
            'employee' => url('/portal/employee'),
            default => null,
        };
    }
}
