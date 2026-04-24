<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AuditLogger
{
    public static function record(
        string $action,
        ?string $targetType = null,
        ?int $targetId = null,
        array $meta = [],
        ?Request $request = null,
    ): void {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        $request ??= request();
        $user     = $request?->user();

        $actorType  = 'admin';
        $actorId    = $user?->id;
        $actorEmail = $user?->email ?? session('client_email');

        if (! $actorId && session('client_id')) {
            $actorType = session('client_type', 'client');
            $actorId   = (int) session('client_id');
        }

        try {
            DB::table('audit_logs')->insert([
                'actor_type'  => $actorType,
                'actor_id'    => $actorId,
                'actor_email' => $actorEmail,
                'action'      => $action,
                'target_type' => $targetType,
                'target_id'   => $targetId,
                'ip_address'  => $request?->ip(),
                'user_agent'  => substr((string) ($request?->userAgent() ?? ''), 0, 500),
                'meta'        => $meta ? json_encode($meta) : null,
                'created_at'  => now(),
            ]);
        } catch (\Throwable $e) {
            // Never let audit logging break the request
        }
    }
}
