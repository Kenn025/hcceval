<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStudentAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if (session('client_type') !== 'student' || ! session('client_id')) {
            return redirect()->route('login');
        }

        return $next($request);
    }
}
