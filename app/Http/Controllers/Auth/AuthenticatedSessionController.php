<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/UnifiedLogin', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $this->sanitizeIntendedUrlForAdmin($request);

        return match ($request->input('login_destination')) {
            '2fa'                 => redirect()->route('two-factor.challenge'),
            'student'             => redirect()->route('portal.student.dashboard'),
            'teacher'             => redirect()->route('portal.teacher.dashboard'),
            'employee'            => redirect()->route('portal.employee.dashboard'),
            default               => redirect()->intended(route('dashboard', absolute: false)),
        };
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }

    private function sanitizeIntendedUrlForAdmin(Request $request): void
    {
        $role = (string) $request->session()->get('admin_role', '');
        $intendedUrl = (string) $request->session()->get('url.intended', '');

        if ($role !== 'superadmin' && str_contains($intendedUrl, '/admin/bug-reports')) {
            $request->session()->forget('url.intended');
        }
    }
}
