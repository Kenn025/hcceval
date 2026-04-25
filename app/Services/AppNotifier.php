<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AppNotifier
{
    public static function record(
        string $recipientType,
        ?int $recipientId,
        ?string $recipientEmail,
        string $type,
        string $title,
        string $body,
        ?string $actionUrl = null,
    ): void {
        if (! Schema::hasTable('app_notifications')) {
            return;
        }

        try {
            DB::table('app_notifications')->insert([
                'recipient_type'  => $recipientType,
                'recipient_id'    => $recipientId,
                'recipient_email' => $recipientEmail,
                'type'            => $type,
                'title'           => $title,
                'body'            => $body,
                'action_url'      => $actionUrl,
                'created_at'      => now(),
            ]);
        } catch (\Throwable) {
            // Never break the request because of a notification write
        }
    }

    public static function notifyAdmins(
        string $type,
        string $title,
        string $body,
        ?string $actionUrl = null,
        ?int $branchId = null,
    ): int {
        if (! Schema::hasTable('admin') || ! Schema::hasTable('app_notifications')) {
            return 0;
        }

        $admins = DB::table('admin')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($branchId, fn ($q) => $q->where(function ($x) use ($branchId) {
                $x->where('branch_id', $branchId)->orWhereIn('role', ['superadmin', 'overalladmin']);
            }))
            ->select('id', 'email')
            ->get();

        $rows = $admins->map(fn ($r) => [
            'recipient_type'  => 'admin',
            'recipient_id'    => $r->id,
            'recipient_email' => $r->email,
            'type'            => $type,
            'title'           => $title,
            'body'            => $body,
            'action_url'      => $actionUrl,
            'created_at'      => now(),
        ])->toArray();

        if (! empty($rows)) {
            DB::table('app_notifications')->insert($rows);
        }

        return count($rows);
    }

    public static function broadcast(
        string $recipientType,
        string $type,
        string $title,
        string $body,
        ?string $actionUrl = null,
        ?int $branchId = null,
    ): int {
        if (! Schema::hasTable($recipientType) || ! Schema::hasTable('app_notifications')) {
            return 0;
        }

        $recipients = DB::table($recipientType)
            ->where('is_activated', 1)
            ->where('is_deleted', 0)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->select('id', 'email')
            ->get();

        $rows = $recipients->map(fn ($r) => [
            'recipient_type'  => $recipientType,
            'recipient_id'    => $r->id,
            'recipient_email' => $r->email,
            'type'            => $type,
            'title'           => $title,
            'body'            => $body,
            'action_url'      => $actionUrl,
            'created_at'      => now(),
        ])->toArray();

        if (! empty($rows)) {
            DB::table('app_notifications')->insert($rows);
        }

        return count($rows);
    }
}
