<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\TwoFactorCode;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorChallengeController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $pending = $request->session()->get('2fa_pending');
        if (! $pending) {
            return redirect()->route('login');
        }

        return Inertia::render('Auth/TwoFactorChallenge', [
            'email' => $this->maskEmail($pending['email'] ?? ''),
        ]);
    }

    public function send(Request $request): RedirectResponse
    {
        $pending = $request->session()->get('2fa_pending');
        if (! $pending) {
            return redirect()->route('login');
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        DB::table('two_factor_tokens')->insert([
            'subject_type' => 'admin',
            'subject_id'   => $pending['admin_id'],
            'code_hash'    => Hash::make($code),
            'expires_at'   => now()->addMinutes(10),
            'created_at'   => now(),
        ]);

        Notification::route('mail', $pending['email'])->notify(new TwoFactorCode($code));

        return back()->with('status', 'A new verification code has been sent.');
    }

    public function verify(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $pending = $request->session()->get('2fa_pending');
        if (! $pending) {
            return redirect()->route('login');
        }

        $token = DB::table('two_factor_tokens')
            ->where('subject_type', 'admin')
            ->where('subject_id', $pending['admin_id'])
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->orderByDesc('id')
            ->first();

        if (! $token || ! Hash::check($data['code'], $token->code_hash)) {
            AuditLogger::record('2fa.failed', 'admin', $pending['admin_id']);
            throw ValidationException::withMessages(['code' => 'That code is invalid or has expired.']);
        }

        DB::table('two_factor_tokens')->where('id', $token->id)->update(['consumed_at' => now()]);

        $user = User::firstOrCreate(
            ['email' => $pending['email']],
            ['name' => $pending['name'], 'password' => bcrypt(str()->random(32))],
        );

        Auth::login($user, (bool) ($pending['remember'] ?? false));

        session([
            'admin_role'      => $pending['role'] ?? 'admin',
            'admin_branch_id' => $pending['branch_id'] ?? null,
            'admin_id'        => $pending['admin_id'],
        ]);

        $request->session()->forget('2fa_pending');
        $request->session()->regenerate();

        AuditLogger::record('auth.login', 'admin', $pending['admin_id']);

        return redirect()->intended(route('dashboard'));
    }

    private function maskEmail(string $email): string
    {
        if (! str_contains($email, '@')) return $email;
        [$local, $domain] = explode('@', $email, 2);
        $visible = substr($local, 0, 2);
        return "{$visible}" . str_repeat('*', max(0, strlen($local) - 2)) . "@{$domain}";
    }
}
