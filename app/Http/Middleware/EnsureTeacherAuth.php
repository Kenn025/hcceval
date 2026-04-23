<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTeacherAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if (session('client_type') !== 'faculty' || ! session('client_id')) {
            return redirect()->route('login');
        }

        return $next($request);
    }
}
