<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Notifications\ClientPasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ClientPasswordResetController extends Controller
{
    public function showRequest(): Response
    {
        return Inertia::render('Auth/ClientForgotPassword', [
            'status' => session('status'),
            'error'  => session('error'),
        ]);
    }

    public function sendLink(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => 'required|email|max:150',
        ]);

        $email = strtolower(trim($data['email']));

        $found = collect(['student', 'teacher', 'employee'])
            ->contains(fn ($table) => DB::table($table)->where('email', $email)->where('is_deleted', 0)->exists());

        if (! $found) {
            return back()->with('status', 'If that email exists, a reset link has been sent.');
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            ['token' => Hash::make($token), 'created_at' => now()],
        );

        Notification::route('mail', $email)->notify(new ClientPasswordReset($token, $email));

        return back()->with('status', 'If that email exists, a reset link has been sent.');
    }

    public function showReset(Request $request): Response
    {
        return Inertia::render('Auth/ClientResetPassword', [
            'token' => $request->query('token'),
            'email' => $request->query('email'),
        ]);
    }

    public function reset(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'token'                 => 'required|string',
            'email'                 => 'required|email|max:150',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $email  = strtolower(trim($data['email']));
        $record = DB::table('password_reset_tokens')->where('email', $email)->first();

        if (! $record || ! Hash::check($data['token'], $record->token)) {
            return back()->withErrors(['email' => 'This reset link is invalid or has expired.']);
        }

        if (now()->diffInMinutes($record->created_at) > 60) {
            return back()->withErrors(['email' => 'This reset link is invalid or has expired.']);
        }

        $hashed = Hash::make($data['password']);

        foreach (['student', 'teacher', 'employee'] as $table) {
            DB::table($table)->where('email', $email)->where('is_deleted', 0)->update([
                'password'   => $hashed,
                'updated_at' => now(),
            ]);
        }

        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return redirect()->route('portal.login')->with('status', 'Your password has been reset. You may now sign in.');
    }
}
