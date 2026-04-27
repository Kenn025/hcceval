<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->input('search', '');

        $logs = DB::table('audit_logs')
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('actor_email', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhere('target_type', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%");
            }))
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 30))
            ->withQueryString()
            ->through(fn ($r) => $this->formatLog($r));

        return Inertia::render('Admin/AuditLogs', [
            'logs'    => $logs,
            'filters' => ['search' => $search],
        ]);
    }

    public function recordPrint(Request $request): JsonResponse
    {
        $data = $request->validate([
            'report' => ['required', 'string', 'max:100'],
            'rating_type' => ['nullable', 'string', 'max:50'],
            'title' => ['nullable', 'string', 'max:150'],
            'school_year' => ['nullable', 'string', 'max:50'],
            'record_count' => ['nullable', 'integer', 'min:0'],
            'target_id' => ['nullable', 'integer'],
        ]);

        AuditLogger::record(
            'report.printed',
            $data['rating_type'] ?? 'report',
            $data['target_id'] ?? null,
            $data,
            $request,
        );

        return response()->json(['recorded' => true]);
    }

    private function formatLog(object $row): array
    {
        $meta = json_decode((string) ($row->meta ?? ''), true);
        $meta = is_array($meta) ? $meta : [];

        return [
            'id'          => $row->id,
            'actor_type'  => $row->actor_type,
            'actor_email' => $row->actor_email,
            'action'      => $row->action,
            'event'       => $this->eventLabel($row->action),
            'details'     => $this->details($row, $meta),
            'target'      => $row->target_type ? "{$row->target_type}#{$row->target_id}" : null,
            'ip_address'  => $row->ip_address,
            'created_at'  => $row->created_at,
        ];
    }

    private function eventLabel(string $action): string
    {
        return match ($action) {
            'auth.login' => 'Admin login',
            'auth.logout' => 'Admin logout',
            'auth.failed' => 'Failed login',
            '2fa.failed' => 'Failed 2FA',
            'report.printed' => 'Printed / saved PDF',
            'report.exported' => 'Exported report',
            default => str($action)
                ->replace(['admin.', '_', '.'], ['', ' ', ' '])
                ->headline()
                ->toString(),
        };
    }

    private function details(object $row, array $meta): string
    {
        if (($row->action ?? '') === 'report.printed') {
            return trim(collect([
                $meta['title'] ?? null,
                $meta['rating_type'] ?? null,
                $meta['school_year'] ?? null,
                isset($meta['record_count']) ? $meta['record_count'] . ' record(s)' : null,
            ])->filter()->implode(' - ')) ?: 'Printable report opened';
        }

        if (($row->action ?? '') === 'report.exported') {
            return trim(collect([
                $meta['report'] ?? null,
                $meta['school_year'] ?? null,
                isset($meta['record_count']) ? $meta['record_count'] . ' record(s)' : null,
            ])->filter()->implode(' - ')) ?: 'Report exported';
        }

        if (! empty($meta['route'])) {
            return collect([
                strtoupper((string) ($meta['method'] ?? '')),
                $meta['route'],
                $row->target_type ? "{$row->target_type}#{$row->target_id}" : null,
            ])->filter()->implode(' - ');
        }

        return $row->target_type ? "{$row->target_type}#{$row->target_id}" : 'System event';
    }
}
