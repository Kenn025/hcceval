<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmployeeAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if (session('client_type') !== 'faculty' || ! session('client_id')) {
            return redirect()->route('portal.login');
        }

        $source = session('client_source');

        if ($source === 'employee') {
            return $next($request);
        }

        if ($source === 'teacher') {
            return redirect()->route('portal.teacher.dashboard');
        }

        // Backward compatibility for old sessions that only have client_role.
        if (strtoupper(trim((string) session('client_role', ''))) === 'EMPLOYEE') {
            return $next($request);
        }

        return redirect()->route('portal.teacher.dashboard');
    }
}
