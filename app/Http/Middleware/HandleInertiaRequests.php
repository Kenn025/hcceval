<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
            'activeAcademicYear' => fn () => $this->activeAcademicYear(),
            'flash' => [
                'success' => session('success'),
                'error'   => session('error'),
                'import_errors' => session('import_errors', []),
            ],
        ];
    }

    private function activeAcademicYear(): ?array
    {
        if (! Schema::hasTable('academic_year')) {
            return null;
        }

        $cycle = DB::table('academic_year')
            ->select('id', 'from_year', 'to_year', 'term')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->where(function ($query) {
                $query->whereNull('date_opened')
                    ->orWhere('date_opened', '<=', now());
            })
            ->orderByDesc('from_year')
            ->orderByDesc('id')
            ->first();

        if (! $cycle) {
            return null;
        }

        $schoolYear = "{$cycle->from_year}-{$cycle->to_year}";

        return [
            'id' => $cycle->id,
            'school_year' => $schoolYear,
            'term' => $cycle->term,
            'label' => trim("{$schoolYear} {$cycle->term}"),
        ];
    }
}
