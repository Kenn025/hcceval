<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $portal = config('admin-portal');

        return [
            ...parent::share($request),
            'auth' => [
                'user'      => $request->user(),
                'role'      => session('admin_role'),
                'branch_id' => session('admin_branch_id'),
            ],
            'portal' => [
                'brand'      => $portal['brand'],
                'navigation' => $portal['sections'],
                'migration'  => $portal['migration'],
            ],
            'flash' => [
                'success' => session('success'),
                'error'   => session('error'),
            ],
        ];
    }
}
