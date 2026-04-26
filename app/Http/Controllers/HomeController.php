<?php

namespace App\Http\Controllers;

use App\Models\LandingPageHeader;
use App\Models\LandingPageHomeSection;
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
            'headerLinks' => $this->headerLinks(),
            'homeSection' => $this->homeSection(),
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

    private function headerLinks(): array
    {
        $defaults = [
            ['label' => 'Home', 'target' => 'home', 'item_type' => 'link', 'sort_order' => 1, 'is_active' => true],
            ['label' => 'Features', 'target' => 'features', 'item_type' => 'link', 'sort_order' => 2, 'is_active' => true],
            ['label' => 'Roles', 'target' => 'roles', 'item_type' => 'link', 'sort_order' => 3, 'is_active' => true],
            ['label' => 'How It Works', 'target' => 'how-it-works', 'item_type' => 'link', 'sort_order' => 4, 'is_active' => true],
            ['label' => 'FAQ', 'target' => 'faq', 'item_type' => 'link', 'sort_order' => 5, 'is_active' => true],
            ['label' => 'Brand Logo', 'target' => 'graduation', 'item_type' => 'logo', 'sort_order' => 0, 'is_active' => true],
            ['label' => 'Brand Title', 'target' => 'MCH-PEMS', 'item_type' => 'brand_title', 'sort_order' => 0, 'is_active' => true],
            ['label' => 'Brand Subtitle', 'target' => 'Evaluation System', 'item_type' => 'brand_subtitle', 'sort_order' => 0, 'is_active' => true],
            ['label' => 'Theme Toggle', 'target' => 'Theme Toggle', 'item_type' => 'toggle', 'sort_order' => 6, 'is_active' => true],
            ['label' => 'Sign In Button', 'target' => 'Sign In', 'item_type' => 'signin', 'sort_order' => 7, 'is_active' => true],
        ];

        if (! Schema::hasTable('landing_page_headers')) {
            return $defaults;
        }

        $links = LandingPageHeader::query()
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'label', 'target', 'item_type', 'sort_order', 'is_active'])
            ->map(fn(LandingPageHeader $header) => [
                'id' => $header->id,
                'label' => $header->label,
                'target' => $header->target,
                'item_type' => $header->item_type,
                'sort_order' => $header->sort_order,
                'is_active' => (bool) $header->is_active,
            ])
            ->values()
            ->all();

        return count($links) > 0 ? $links : $defaults;
    }

    private function homeSection(): array
    {
        $defaults = [
            'badge_text' => 'Thesis Project 2026',
            'title_text' => 'Web-Based Multicampus Performance Evaluation System',
            'title_highlight_text' => 'Multicampus',
            'subtitle_text' => 'A comprehensive holistic computerized faculty-peer-student-admin performance evaluation management system connecting all stakeholders.',
            'primary_cta_label' => 'Start Evaluating',
            'primary_cta_target' => 'login',
            'secondary_cta_label' => 'Learn More',
            'secondary_cta_target' => 'how-it-works',
            'background_video_path' => '/videos/hero-loop.mp4',
        ];

        if (! Schema::hasTable('landing_page_home_sections')) {
            return $defaults;
        }

        $homeSection = LandingPageHomeSection::query()->first();
        if (! $homeSection) {
            return $defaults;
        }

        return [
            'badge_text' => $homeSection->badge_text,
            'title_text' => $homeSection->title_text,
            'title_highlight_text' => $homeSection->title_highlight_text,
            'subtitle_text' => $homeSection->subtitle_text,
            'primary_cta_label' => $homeSection->primary_cta_label,
            'primary_cta_target' => $homeSection->primary_cta_target,
            'secondary_cta_label' => $homeSection->secondary_cta_label,
            'secondary_cta_target' => $homeSection->secondary_cta_target,
            'background_video_path' => $homeSection->background_video_path,
        ];
    }
}
