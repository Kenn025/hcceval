<?php

namespace App\Http\Middleware;

use App\Services\AuditLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogAdminActivity
{
    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'current_password',
        'token',
        '_token',
        'code',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $this->shouldRecord($request, $response)) {
            return $response;
        }

        AuditLogger::record(
            $this->actionName($request),
            $this->targetType($request),
            $this->targetId($request),
            [
                'method' => $request->method(),
                'route' => $request->route()?->getName(),
                'path' => $request->path(),
                'input' => $this->safeInput($request),
            ],
            $request,
        );

        return $response;
    }

    private function shouldRecord(Request $request, Response $response): bool
    {
        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return false;
        }

        if ($response->getStatusCode() >= 400) {
            return false;
        }

        if ($request->routeIs('admin.audit-logs.print')) {
            return false;
        }

        return $request->user() !== null || session()->has('admin_id');
    }

    private function actionName(Request $request): string
    {
        $routeName = $request->route()?->getName();

        if ($routeName) {
            return 'admin.' . str_replace(['admin.', '.'], ['', '_'], $routeName);
        }

        return 'admin.' . strtolower($request->method()) . '.' . trim(str_replace('/', '.', $request->path()), '.');
    }

    private function targetType(Request $request): ?string
    {
        $route = $request->route();

        if (! $route) {
            return null;
        }

        foreach ($route->parameters() as $key => $value) {
            if (is_numeric($value) || (is_object($value) && isset($value->id))) {
                return (string) $key;
            }
        }

        return $route->getName();
    }

    private function targetId(Request $request): ?int
    {
        $route = $request->route();

        if (! $route) {
            return null;
        }

        foreach ($route->parameters() as $value) {
            if (is_numeric($value)) {
                return (int) $value;
            }

            if (is_object($value) && isset($value->id)) {
                return (int) $value->id;
            }
        }

        return null;
    }

    private function safeInput(Request $request): array
    {
        $input = collect($request->except(self::SENSITIVE_KEYS))
            ->map(function ($value) {
                if (is_string($value)) {
                    return mb_substr($value, 0, 250);
                }

                if (is_array($value)) {
                    return collect($value)->take(20)->all();
                }

                return $value;
            })
            ->all();

        return $input;
    }
}
