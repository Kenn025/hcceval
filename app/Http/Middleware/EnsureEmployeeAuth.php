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

        if (strtoupper(trim((string) session('client_role', ''))) !== 'EMPLOYEE') {
            return redirect()->route('portal.teacher.dashboard');
        }

        return $next($request);
    }
}
