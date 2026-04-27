<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role'          => \App\Http\Middleware\EnsureAdminRole::class,
            'audit.admin'   => \App\Http\Middleware\LogAdminActivity::class,
            'student.auth'  => \App\Http\Middleware\EnsureStudentAuth::class,
            'teacher.auth'  => \App\Http\Middleware\EnsureTeacherAuth::class,
            'employee.auth' => \App\Http\Middleware\EnsureEmployeeAuth::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
