<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class ContactMessageInboxController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $view = strtolower(trim((string) $request->input('view', 'open')));
        $view = in_array($view, ['open', 'resolved'], true) ? $view : 'open';
        $perPage = $request->integer('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100], true) ? $perPage : 15;

        if (! Schema::hasTable('contact_messages')) {
            return Inertia::render('Admin/ContactUs', [
                'messages' => [
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
                    'view' => $view,
                    'per_page' => $perPage,
                ],
                'tableMissing' => true,
            ]);
        }

        $messages = ContactMessage::query()
            ->when($view === 'resolved', function ($query) {
                $query->where('status', 'resolved');
            }, function ($query) {
                $query->where('status', '!=', 'resolved');
            })
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('subject', 'like', "%{$search}%")
                        ->orWhere('message', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Admin/ContactUs', [
            'messages' => $messages,
            'filters' => [
                'search' => $search,
                'view' => $view,
                'per_page' => $perPage,
            ],
            'tableMissing' => false,
        ]);
    }

    public function markRead(ContactMessage $contactMessage)
    {
        if ((string) $contactMessage->status === 'new') {
            $contactMessage->update([
                'status' => 'read',
                'read_at' => now(),
            ]);
        }

        return back()->with('success', 'Contact message marked as read.');
    }

    public function resolve(ContactMessage $contactMessage)
    {
        if ((string) $contactMessage->status !== 'resolved') {
            $contactMessage->update([
                'status' => 'resolved',
                'read_at' => $contactMessage->read_at ?? now(),
                'resolved_at' => now(),
            ]);
        }

        return back()->with('success', 'Contact message marked as resolved.');
    }
}
