<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Services\AppNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ContactMessageController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        if (! Schema::hasTable('contact_messages')) {
            return back()->withErrors([
                'contact' => 'Contact messages table is not ready yet. Please run migrations first.',
            ]);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150'],
            'subject' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $message = ContactMessage::create([
            'name' => trim($data['name']),
            'email' => strtolower(trim($data['email'])),
            'subject' => trim((string) ($data['subject'] ?? '')),
            'message' => trim($data['message']),
            'status' => 'new',
        ]);

        $this->notifySuperAdmins($message);

        return back()->with('success', 'Your message has been sent.');
    }

    private function notifySuperAdmins(ContactMessage $message): void
    {
        if (! Schema::hasTable('admin')) {
            return;
        }

        DB::table('admin')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->where('role', 'superadmin')
            ->select('id', 'email', 'name')
            ->get()
            ->each(function ($admin) use ($message) {
                AppNotifier::record(
                    'admin',
                    (int) $admin->id,
                    $admin->email ?: null,
                    'contact.message.received',
                    'New contact message',
                    sprintf('%s sent a contact message: "%s".', $message->name, $message->subject ?: 'No subject'),
                    url('/admin/contact-us'),
                );
            });
    }
}
