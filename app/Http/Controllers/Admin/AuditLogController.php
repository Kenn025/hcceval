<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
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
                    ->orWhere('target_type', 'like', "%{$search}%");
            }))
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 30))
            ->withQueryString()
            ->through(fn ($r) => [
                'id'          => $r->id,
                'actor_type'  => $r->actor_type,
                'actor_email' => $r->actor_email,
                'action'      => $r->action,
                'target'      => $r->target_type ? "{$r->target_type}#{$r->target_id}" : null,
                'ip_address'  => $r->ip_address,
                'created_at'  => $r->created_at,
            ]);

        return Inertia::render('Admin/AuditLogs', [
            'logs'    => $logs,
            'filters' => ['search' => $search],
        ]);
    }
}
