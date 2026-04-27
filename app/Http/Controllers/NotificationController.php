<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! Schema::hasTable('app_notifications')) {
            return response()->json(['items' => [], 'unread' => 0]);
        }

        [$type, $id, $email] = $this->currentRecipient();

        if (! $type) {
            return response()->json(['items' => [], 'unread' => 0]);
        }

        $query = DB::table('app_notifications')
            ->where('recipient_type', $type)
            ->where(function ($q) use ($id, $email) {
                if ($id) {
                    $q->where('recipient_id', $id);
                }
                if ($email) {
                    $q->orWhere('recipient_email', $email);
                }
            });

        $items = (clone $query)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get(['id', 'type', 'title', 'body', 'action_url', 'read_at', 'created_at'])
            ->map(fn($r) => [
                'id'         => $r->id,
                'type'       => $r->type,
                'title'      => $r->title,
                'body'       => $r->body,
                'action_url' => $this->sanitizeActionUrl($type, $r->action_url),
                'read'       => (bool) $r->read_at,
                'created_at' => $r->created_at,
            ]);

        $unread = (clone $query)->whereNull('read_at')->count();

        return response()->json([
            'items'  => $items,
            'unread' => $unread,
        ]);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        [$type, $rid, $email] = $this->currentRecipient();
        if (! $type) {
            return response()->json(['ok' => false], 401);
        }

        DB::table('app_notifications')
            ->where('id', $id)
            ->where('recipient_type', $type)
            ->where(function ($q) use ($rid, $email) {
                if ($rid) {
                    $q->where('recipient_id', $rid);
                }
                if ($email) {
                    $q->orWhere('recipient_email', $email);
                }
            })
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        [$type, $rid, $email] = $this->currentRecipient();
        if (! $type) {
            return response()->json(['ok' => false], 401);
        }

        DB::table('app_notifications')
            ->where('recipient_type', $type)
            ->where(function ($q) use ($rid, $email) {
                if ($rid) {
                    $q->where('recipient_id', $rid);
                }
                if ($email) {
                    $q->orWhere('recipient_email', $email);
                }
            })
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function clear(Request $request): RedirectResponse|JsonResponse
    {
        [$type, $rid, $email] = $this->currentRecipient();
        if (! $type) {
            return response()->json(['ok' => false], 401);
        }

        DB::table('app_notifications')
            ->where('recipient_type', $type)
            ->where(function ($q) use ($rid, $email) {
                if ($rid) {
                    $q->where('recipient_id', $rid);
                }
                if ($email) {
                    $q->orWhere('recipient_email', $email);
                }
            })
            ->delete();

        return response()->json(['ok' => true]);
    }

    private function currentRecipient(): array
    {
        if (session('admin_id')) {
            return ['admin', (int) session('admin_id'), Auth::user()?->email];
        }

        if (session('client_id') && session('client_type')) {
            $type = session('client_source', 'student');
            if (! in_array($type, ['student', 'teacher', 'employee'], true)) {
                $type = 'student';
            }
            $row = DB::table($type)->where('id', session('client_id'))->first();
            return [$type, (int) session('client_id'), $row?->email];
        }

        return [null, null, null];
    }

    private function sanitizeActionUrl(string $recipientType, ?string $actionUrl): ?string
    {
        if (! $actionUrl) {
            return null;
        }

        if ($recipientType !== 'admin') {
            return $actionUrl;
        }

        $role = (string) session('admin_role', 'admin');
        if ($role !== 'superadmin' && str_contains($actionUrl, '/admin/bug-reports')) {
            return url('/dashboard');
        }

        return $actionUrl;
    }
}
