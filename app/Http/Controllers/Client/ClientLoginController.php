<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ClientLoginController extends Controller
{
    public function showLogin(): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }

        if (session('client_type') === 'student' && session('client_id')) {
            return redirect()->route('portal.student.dashboard');
        }

        if (session('client_type') === 'faculty' && session('client_id')) {
            $source = session('client_source');

            if ($source === 'employee') {
                return redirect()->route('portal.employee.dashboard');
            }

            if ($source === 'teacher') {
                return redirect()->route('portal.teacher.dashboard');
            }

            // Backward compatibility for old sessions that only have client_role.
            $role = session('client_role', 'FACULTY');
            return redirect()->route(
                strtoupper(trim((string) $role)) === 'EMPLOYEE'
                    ? 'portal.employee.dashboard'
                    : 'portal.teacher.dashboard'
            );
        }

        return Inertia::render('Auth/UnifiedLogin', [
            'status'      => session('status'),
            'error'       => session('error'),
            'submitRoute' => 'login.submit',
        ]);
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('portal.login');
    }
}
