<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Home', [
            'stats' => $this->stats(),
        ]);
    }

    private function stats(): array
    {
        $evaluations = Schema::hasTable('evaluation_submissions')
            ? DB::table('evaluation_submissions')->count()
            : 0;

        return [
            [
                'value' => $this->activeCount('student'),
                'label' => 'Active Students',
                'icon' => 'students',
            ],
            [
                'value' => $this->activeCount('teacher'),
                'label' => 'Active Faculty',
                'icon' => 'teachers',
            ],
            [
                'value' => $this->activeCount('branch'),
                'label' => 'Active Campuses',
                'icon' => 'branches',
            ],
            [
                'value' => $evaluations,
                'label' => 'Evaluations Submitted',
                'icon' => 'assignments',
            ],
        ];
    }

    private function activeCount(string $table): int
    {
        if (! Schema::hasTable($table)) {
            return 0;
        }

        return DB::table($table)
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->count();
    }
}
