<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LandingPageFeature;
use App\Models\LandingPageFeatureSection;
use App\Models\LandingPageHeader;
use App\Models\LandingPageHomeSection;
use App\Models\LandingPageHowItWorksSection;
use App\Models\LandingPageHowItWorksStep;
use App\Models\LandingPageRole;
use App\Models\LandingPageRolesSection;
use App\Models\LandingPageStat;
use App\Models\LandingPageTestimonial;
use App\Models\LandingPageTestimonialSection;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class LandingPageHeaderController extends Controller
{
    private const DEFAULT_HOME_SECTION = [
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
    private const DEFAULT_FEATURE_SECTION = [
        'badge_text' => 'Features',
        'title_text' => 'Powerful Capabilities',
        'subtitle_text' => 'Everything you need for comprehensive evaluation management',
    ];
    private const DEFAULT_ROLES_SECTION = [
        'badge_text' => 'User Roles',
        'title_text' => 'Four Integrated Roles',
        'subtitle_text' => 'Click a role to explore its capabilities',
    ];
    private const DEFAULT_HOW_IT_WORKS_SECTION = [
        'badge_text' => 'Process',
        'title_text' => 'How It Works',
        'subtitle_text' => 'Simple evaluation process in four steps',
    ];
    private const DEFAULT_TESTIMONIAL_SECTION = [
        'badge_text' => 'Testimonials',
        'title_text' => 'What Users Say',
    ];
    private const DEFAULT_ROLES = [
        [
            'title' => 'Faculty',
            'desc_text' => 'Comprehensive evaluation tools for academic professionals',
            'features' => ['Self-Assessment Portal', 'Peer Review Access', 'Student Feedback View', 'Performance History', 'Development Reports'],
            'progress' => 85,
            'icon_type' => 'faculty',
            'sort_order' => 1,
        ],
        [
            'title' => 'Peer',
            'desc_text' => 'Collaborative evaluation between colleagues',
            'features' => ['Anonymous Reviews', '360° Assessment', 'Teaching Observation', 'Collaborative Goals', 'Best Practices Share'],
            'progress' => 78,
            'icon_type' => 'peer',
            'sort_order' => 2,
        ],
        [
            'title' => 'Student',
            'desc_text' => 'Student-centered faculty evaluation system',
            'features' => ['Course Feedback', 'Anonymous Surveys', 'Learning Outcomes', 'Suggestion Portal', 'Progress Tracking'],
            'progress' => 92,
            'icon_type' => 'student',
            'sort_order' => 3,
        ],
        [
            'title' => 'Administrator',
            'desc_text' => 'Complete system oversight and management',
            'features' => ['Analytics Dashboard', 'User Management', 'Report Generation', 'Campus Settings', 'System Configuration'],
            'progress' => 95,
            'icon_type' => 'admin',
            'sort_order' => 4,
        ],
    ];
    private const DEFAULT_FEATURES = [
        [
            'title' => 'Real-Time Analytics',
            'subtitle' => 'Live performance tracking with interactive charts and comprehensive dashboards.',
            'sort_order' => 1,
        ],
        [
            'title' => 'Secure & Private',
            'subtitle' => 'Enterprise-grade encryption ensuring all evaluations remain confidential.',
            'sort_order' => 2,
        ],
        [
            'title' => 'Multi-Device',
            'subtitle' => 'Responsive design accessible on desktop, tablet, and mobile devices.',
            'sort_order' => 3,
        ],
        [
            'title' => 'Multi-Campus',
            'subtitle' => 'Seamlessly connect and manage evaluations across multiple campuses.',
            'sort_order' => 4,
        ],
        [
            'title' => 'Customizable',
            'subtitle' => 'Tailor evaluation criteria and workflows to your institution needs.',
            'sort_order' => 5,
        ],
        [
            'title' => 'Detailed Reports',
            'subtitle' => 'Generate comprehensive PDF reports with actionable insights.',
            'sort_order' => 6,
        ],
    ];
    private const DEFAULT_HOW_IT_WORKS_STEPS = [
        [
            'step_number' => '01',
            'title' => 'Register',
            'subtitle' => 'Create account and select your role',
            'sort_order' => 1,
        ],
        [
            'step_number' => '02',
            'title' => 'Configure',
            'subtitle' => 'Set up evaluation criteria',
            'sort_order' => 2,
        ],
        [
            'step_number' => '03',
            'title' => 'Evaluate',
            'subtitle' => 'Complete evaluations forms',
            'sort_order' => 3,
        ],
        [
            'step_number' => '04',
            'title' => 'Analyze',
            'subtitle' => 'View reports and insights',
            'sort_order' => 4,
        ],
    ];
    private const DEFAULT_STATS = [
        'students' => [
            'label' => 'Active Students',
            'icon' => 'students',
            'sort_order' => 1,
            'source' => 'student',
        ],
        'faculty' => [
            'label' => 'Active Faculty',
            'icon' => 'teachers',
            'sort_order' => 2,
            'source' => 'teacher',
        ],
        'campuses' => [
            'label' => 'Active Campuses',
            'icon' => 'branches',
            'sort_order' => 3,
            'source' => 'branch',
        ],
        'evaluations' => [
            'label' => 'Evaluations Submitted',
            'icon' => 'assignments',
            'sort_order' => 4,
            'source' => 'evaluation_submissions',
        ],
    ];

    public function index(Request $request)
    {
        $search = $request->input('search', '');

        $perPage = $request->integer('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100]) ? $perPage : 15;

        $headers = LandingPageHeader::query()
            ->when($search, function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('label', 'like', "%{$search}%")
                        ->orWhere('target', 'like', "%{$search}%")
                        ->orWhere('item_type', 'like', "%{$search}%");
                });
            })
            ->orderBy('sort_order')
            ->orderBy('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Admin/LandingPage', [
            'headers' => $headers,
            'homeSection' => $this->homeSectionData(),
            'statsSection' => $this->statsSectionData(),
            'featuresSection' => $this->featureSectionData(),
            'rolesSection' => $this->rolesSectionData(),
            'howItWorksSection' => $this->howItWorksSectionData(),
            'testimonialsSection' => $this->testimonialsSectionData(),
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:100',
            'target' => 'nullable|string|max:150',
            'item_type' => 'required|in:link,logo,brand_title,brand_subtitle,toggle,signin',
            'sort_order' => 'nullable|integer|min:0|max:9999',
            'is_active' => 'boolean',
            'logo_file' => 'nullable|image|max:3072',
        ]);

        if ($validated['item_type'] === 'logo') {
            if ($request->hasFile('logo_file')) {
                $validated['target'] = $this->storeLogoFile($request->file('logo_file'));
            }

            if (blank($validated['target'] ?? null)) {
                return back()
                    ->withErrors(['target' => 'Target is required for logo items.'])
                    ->withInput();
            }
        } elseif (blank($validated['target'] ?? null)) {
            return back()
                ->withErrors(['target' => 'Target is required.'])
                ->withInput();
        }

        LandingPageHeader::create([
            ...$validated,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : true,
        ]);

        return back()->with('success', 'Landing page header link created successfully.');
    }

    public function update(Request $request, LandingPageHeader $landingPageHeader)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:100',
            'target' => 'nullable|string|max:150',
            'item_type' => 'required|in:link,logo,brand_title,brand_subtitle,toggle,signin',
            'sort_order' => 'nullable|integer|min:0|max:9999',
            'is_active' => 'boolean',
            'logo_file' => 'nullable|image|max:3072',
        ]);

        $nextTarget = $validated['target'] ?? $landingPageHeader->target;

        if ($validated['item_type'] === 'logo') {
            if ($request->hasFile('logo_file')) {
                $this->deleteManagedLogoIfExists($landingPageHeader->target);
                $nextTarget = $this->storeLogoFile($request->file('logo_file'));
            }

            if (blank($nextTarget)) {
                return back()
                    ->withErrors(['target' => 'Target is required for logo items.'])
                    ->withInput();
            }
        } elseif (blank($nextTarget)) {
            return back()
                ->withErrors(['target' => 'Target is required.'])
                ->withInput();
        }

        $landingPageHeader->update([
            ...$validated,
            'target' => $nextTarget,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : $landingPageHeader->is_active,
        ]);

        return back()->with('success', 'Landing page header link updated successfully.');
    }

    public function destroy(LandingPageHeader $landingPageHeader)
    {
        $this->deleteManagedLogoIfExists($landingPageHeader->target);
        $landingPageHeader->delete();

        return back()->with('success', 'Landing page header link deleted.');
    }

    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'headers' => 'required|array',
            'headers.*.id' => 'nullable|integer|exists:landing_page_headers,id',
            'headers.*.label' => 'required|string|max:100',
            'headers.*.target' => 'nullable|string|max:150',
            'headers.*.item_type' => 'required|in:link,logo,brand_title,brand_subtitle,toggle,signin',
            'headers.*.sort_order' => 'nullable|integer|min:0|max:9999',
            'headers.*.is_active' => 'boolean',
            'headers.*.logo_file' => 'nullable|image|max:3072',
            'delete_ids' => 'nullable|array',
            'delete_ids.*' => 'integer|exists:landing_page_headers,id',
        ]);

        $ids = collect($validated['headers'])
            ->pluck('id')
            ->filter()
            ->values();
        $deleteIds = collect($validated['delete_ids'] ?? [])
            ->filter()
            ->values();
        $activeHeaders = collect($validated['headers'])
            ->reject(
                fn(array $row) => isset($row['id']) && $deleteIds->contains($row['id']),
            )
            ->values();

        $headersById = LandingPageHeader::query()
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        foreach ($activeHeaders as $index => $row) {
            $target = trim((string) ($row['target'] ?? ''));
            $itemType = $row['item_type'] ?? 'link';
            $hasLogoUpload = isset($row['logo_file']) && $row['logo_file'] instanceof UploadedFile;

            $missingTarget = $itemType === 'logo'
                ? $target === '' && ! $hasLogoUpload
                : $target === '';

            if ($missingTarget) {
                return back()
                    ->withErrors(["headers.{$index}.target" => 'Target is required.'])
                    ->withInput();
            }
        }

        DB::transaction(function () use ($activeHeaders, $deleteIds, $headersById) {
            if ($deleteIds->isNotEmpty()) {
                $headersToDelete = LandingPageHeader::query()
                    ->whereIn('id', $deleteIds)
                    ->get(['id', 'target']);

                foreach ($headersToDelete as $headerToDelete) {
                    $this->deleteManagedLogoIfExists($headerToDelete->target);
                }

                LandingPageHeader::query()
                    ->whereIn('id', $deleteIds)
                    ->delete();
            }

            foreach ($activeHeaders as $row) {
                $header = isset($row['id']) ? $headersById->get($row['id']) : null;
                $nextTarget = $row['target'] ?? '';
                $logoFile = $row['logo_file'] ?? null;

                if ($logoFile instanceof UploadedFile && ($row['item_type'] ?? null) === 'logo') {
                    if ($header) {
                        $this->deleteManagedLogoIfExists($header->target);
                    }
                    $nextTarget = $this->storeLogoFile($logoFile);
                }

                if ($header) {
                    if (
                        $header->item_type === 'logo' &&
                        ($row['item_type'] ?? null) !== 'logo'
                    ) {
                        $this->deleteManagedLogoIfExists($header->target);
                    }

                    $header->update([
                        'label' => $row['label'],
                        'target' => $nextTarget,
                        'item_type' => $row['item_type'],
                        'sort_order' => $row['sort_order'] ?? 0,
                        'is_active' => (bool) ($row['is_active'] ?? false),
                    ]);
                    continue;
                }

                LandingPageHeader::create([
                    'label' => $row['label'],
                    'target' => $nextTarget,
                    'item_type' => $row['item_type'],
                    'sort_order' => $row['sort_order'] ?? 0,
                    'is_active' => (bool) ($row['is_active'] ?? false),
                ]);
            }
        });

        return back()->with('success', 'Landing page header links updated successfully.');
    }

    public function updateHomeSection(Request $request)
    {
        if (! Schema::hasTable('landing_page_home_sections')) {
            return back()->withErrors([
                'home_section' => 'Home section table is not available yet. Please run migrations first.',
            ]);
        }

        $validated = $request->validate([
            'badge_text' => 'required|string|max:120',
            'title_text' => 'required|string|max:255',
            'title_highlight_text' => 'nullable|string|max:120',
            'subtitle_text' => 'required|string|max:1000',
            'primary_cta_label' => 'required|string|max:120',
            'primary_cta_target' => 'required|string|max:150',
            'secondary_cta_label' => 'required|string|max:120',
            'secondary_cta_target' => 'required|string|max:150',
            'background_video_file' => 'nullable|file|mimetypes:video/mp4,video/webm,video/ogg|max:102400',
        ]);

        $homeSection = LandingPageHomeSection::query()->first();
        if (! $homeSection) {
            $homeSection = LandingPageHomeSection::query()->create(self::DEFAULT_HOME_SECTION);
        }

        $nextVideoPath = $homeSection->background_video_path ?: (self::DEFAULT_HOME_SECTION['background_video_path']);
        if ($request->hasFile('background_video_file')) {
            $this->deleteManagedVideoIfExists($homeSection->background_video_path);
            $nextVideoPath = $this->storeBackgroundVideo($request->file('background_video_file'));
        }

        $homeSection->update([
            'badge_text' => $validated['badge_text'],
            'title_text' => $validated['title_text'],
            'title_highlight_text' => $validated['title_highlight_text'] ?? '',
            'subtitle_text' => $validated['subtitle_text'],
            'primary_cta_label' => $validated['primary_cta_label'],
            'primary_cta_target' => $validated['primary_cta_target'],
            'secondary_cta_label' => $validated['secondary_cta_label'],
            'secondary_cta_target' => $validated['secondary_cta_target'],
            'background_video_path' => $nextVideoPath,
        ]);

        return back()->with('success', 'Home section updated successfully.');
    }

    public function updateStatsSection(Request $request)
    {
        if (! Schema::hasTable('landing_page_stats')) {
            return back()->withErrors([
                'stats_section' => 'Stats section table is not available yet. Please run migrations first.',
            ]);
        }

        $validated = $request->validate([
            'stats' => 'nullable|array',
            'stats.*.id' => 'nullable|integer|exists:landing_page_stats,id',
            'stats.*.stat_key' => 'required|string|max:50',
            'stats.*.label' => 'required|string|max:120',
            'stats.*.sort_order' => 'nullable|integer|min:0|max:9999',
            'delete_ids' => 'nullable|array',
            'delete_ids.*' => 'integer|exists:landing_page_stats,id',
        ]);

        $statsPayload = collect($validated['stats'] ?? [])
            ->map(function (array $row, int $index) {
                $normalizedKey = Str::of((string) ($row['stat_key'] ?? ''))
                    ->lower()
                    ->replace(' ', '_')
                    ->replaceMatches('/[^a-z0-9_]/', '')
                    ->value();

                return [
                    'id' => $row['id'] ?? null,
                    'stat_key' => $normalizedKey,
                    'label' => $row['label'],
                    'sort_order' => $row['sort_order'] ?? ($index + 1),
                ];
            })
            ->values();
        $deleteIds = collect($validated['delete_ids'] ?? [])
            ->filter()
            ->values();

        foreach ($statsPayload as $index => $row) {
            if (blank($row['stat_key'])) {
                return back()
                    ->withErrors(["stats.{$index}.stat_key" => 'Metric is required.'])
                    ->withInput();
            }
        }

        $duplicateKeys = $statsPayload
            ->pluck('stat_key')
            ->duplicates()
            ->values();
        if ($duplicateKeys->isNotEmpty()) {
            return back()
                ->withErrors([
                    'stats' => 'Duplicate metric keys are not allowed.',
                ])
                ->withInput();
        }

        $ids = $statsPayload->pluck('id')->filter()->values();
        $statsById = LandingPageStat::query()
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        DB::transaction(function () use ($statsPayload, $statsById, $deleteIds) {
            if ($deleteIds->isNotEmpty()) {
                LandingPageStat::query()
                    ->whereIn('id', $deleteIds)
                    ->delete();
            }

            foreach ($statsPayload as $index => $row) {
                if (isset($row['id']) && $deleteIds->contains($row['id'])) {
                    continue;
                }

                if (! empty($row['id'])) {
                    $stat = $statsById->get($row['id']);
                    if (! $stat) {
                        continue;
                    }

                    // Guard stat_key uniqueness excluding current record.
                    $exists = LandingPageStat::query()
                        ->where('stat_key', $row['stat_key'])
                        ->where('id', '!=', $stat->id)
                        ->exists();
                    if ($exists) {
                        continue;
                    }

                    $stat->update([
                        'stat_key' => $row['stat_key'],
                        'label' => $row['label'],
                        'sort_order' => $row['sort_order'] ?? ($index + 1),
                    ]);
                    continue;
                }

                $uniqueKey = $row['stat_key'];
                $counter = 1;
                while (LandingPageStat::query()->where('stat_key', $uniqueKey)->exists()) {
                    $counter++;
                    $uniqueKey = "{$row['stat_key']}_{$counter}";
                }

                LandingPageStat::create([
                    'stat_key' => $uniqueKey,
                    'label' => $row['label'],
                    'sort_order' => $row['sort_order'] ?? ($index + 1),
                    'is_active' => true,
                ]);
            }

            // Keep ordering dense after deletions/edits so UI and DB stay aligned.
            $orderedIds = LandingPageStat::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->pluck('id')
                ->values();

            foreach ($orderedIds as $position => $id) {
                LandingPageStat::query()
                    ->where('id', $id)
                    ->update(['sort_order' => $position + 1]);
            }
        });

        return back()->with('success', 'Stats section updated successfully.');
    }

    public function updateFeaturesSection(Request $request)
    {
        if (! Schema::hasTable('landing_page_feature_sections') || ! Schema::hasTable('landing_page_features')) {
            return back()->withErrors([
                'features_section' => 'Features section table is not available yet. Please run migrations first.',
            ]);
        }

        $validated = $request->validate([
            'badge_text' => 'required|string|max:120',
            'title_text' => 'required|string|max:255',
            'subtitle_text' => 'required|string|max:1000',
            'features' => 'nullable|array',
            'features.*.id' => 'nullable|integer|exists:landing_page_features,id',
            'features.*.title' => 'required|string|max:150',
            'features.*.subtitle' => 'required|string|max:500',
            'features.*.sort_order' => 'nullable|integer|min:0|max:9999',
            'delete_ids' => 'nullable|array',
            'delete_ids.*' => 'integer|exists:landing_page_features,id',
        ]);

        $featuresPayload = collect($validated['features'] ?? [])
            ->map(fn(array $row, int $index) => [
                'id' => $row['id'] ?? null,
                'title' => trim((string) ($row['title'] ?? '')),
                'subtitle' => trim((string) ($row['subtitle'] ?? '')),
                'sort_order' => $row['sort_order'] ?? ($index + 1),
            ])
            ->values();
        $deleteIds = collect($validated['delete_ids'] ?? [])->filter()->values();
        $ids = $featuresPayload->pluck('id')->filter()->values();
        $featuresById = LandingPageFeature::query()
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        DB::transaction(function () use ($validated, $featuresPayload, $deleteIds, $featuresById) {
            $featureSection = LandingPageFeatureSection::query()->first();
            if (! $featureSection) {
                $featureSection = LandingPageFeatureSection::query()->create(self::DEFAULT_FEATURE_SECTION);
            }

            $featureSection->update([
                'badge_text' => $validated['badge_text'],
                'title_text' => $validated['title_text'],
                'subtitle_text' => $validated['subtitle_text'],
            ]);

            if ($deleteIds->isNotEmpty()) {
                LandingPageFeature::query()
                    ->whereIn('id', $deleteIds)
                    ->delete();
            }

            foreach ($featuresPayload as $index => $row) {
                if (isset($row['id']) && $deleteIds->contains($row['id'])) {
                    continue;
                }

                if (! empty($row['id'])) {
                    $feature = $featuresById->get($row['id']);
                    if (! $feature) {
                        continue;
                    }

                    $feature->update([
                        'title' => $row['title'],
                        'subtitle' => $row['subtitle'],
                        'sort_order' => $row['sort_order'] ?? ($index + 1),
                    ]);
                    continue;
                }

                LandingPageFeature::create([
                    'title' => $row['title'],
                    'subtitle' => $row['subtitle'],
                    'sort_order' => $row['sort_order'] ?? ($index + 1),
                    'is_active' => true,
                ]);
            }

            $orderedIds = LandingPageFeature::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->pluck('id')
                ->values();

            foreach ($orderedIds as $position => $id) {
                LandingPageFeature::query()
                    ->where('id', $id)
                    ->update(['sort_order' => $position + 1]);
            }
        });

        return back()->with('success', 'Features section updated successfully.');
    }

    public function updateRolesSection(Request $request)
    {
        if (! Schema::hasTable('landing_page_roles_section') || ! Schema::hasTable('landing_page_roles')) {
            return back()->withErrors([
                'roles_section' => 'Roles section table is not available yet. Please run migrations first.',
            ]);
        }

        $validated = $request->validate([
            'badge_text' => 'required|string|max:120',
            'title_text' => 'required|string|max:255',
            'subtitle_text' => 'required|string|max:1000',
            'roles' => 'nullable|array',
            'roles.*.id' => 'nullable|integer|exists:landing_page_roles,id',
            'roles.*.title' => 'required|string|max:120',
            'roles.*.desc_text' => 'required|string|max:500',
            'roles.*.features' => 'nullable|array',
            'roles.*.features.*' => 'string|max:150',
            'roles.*.progress' => 'nullable|integer|min:0|max:100',
            'roles.*.icon_type' => 'nullable|in:faculty,peer,student,admin',
            'roles.*.sort_order' => 'nullable|integer|min:0|max:9999',
            'delete_ids' => 'nullable|array',
            'delete_ids.*' => 'integer|exists:landing_page_roles,id',
        ]);

        $rolesPayload = collect($validated['roles'] ?? [])
            ->map(fn(array $row, int $index) => [
                'id' => $row['id'] ?? null,
                'title' => trim((string) ($row['title'] ?? '')),
                'desc_text' => trim((string) ($row['desc_text'] ?? '')),
                'features' => array_values(array_filter(array_map('trim', $row['features'] ?? []), fn($f) => $f !== '')),
                'progress' => (int) ($row['progress'] ?? 0),
                'icon_type' => $row['icon_type'] ?? 'faculty',
                'sort_order' => $row['sort_order'] ?? ($index + 1),
            ])
            ->values();
        $deleteIds = collect($validated['delete_ids'] ?? [])->filter()->values();
        $ids = $rolesPayload->pluck('id')->filter()->values();
        $rolesById = LandingPageRole::query()
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        DB::transaction(function () use ($validated, $rolesPayload, $deleteIds, $rolesById) {
            $rolesSection = LandingPageRolesSection::query()->first();
            if (! $rolesSection) {
                $rolesSection = LandingPageRolesSection::query()->create(self::DEFAULT_ROLES_SECTION);
            }

            $rolesSection->update([
                'badge_text' => $validated['badge_text'],
                'title_text' => $validated['title_text'],
                'subtitle_text' => $validated['subtitle_text'],
            ]);

            if ($deleteIds->isNotEmpty()) {
                LandingPageRole::query()
                    ->whereIn('id', $deleteIds)
                    ->delete();
            }

            foreach ($rolesPayload as $index => $row) {
                if (isset($row['id']) && $deleteIds->contains($row['id'])) {
                    continue;
                }

                if (! empty($row['id'])) {
                    $role = $rolesById->get($row['id']);
                    if (! $role) {
                        continue;
                    }

                    $role->update([
                        'title' => $row['title'],
                        'desc_text' => $row['desc_text'],
                        'features' => $row['features'],
                        'progress' => $row['progress'],
                        'icon_type' => $row['icon_type'],
                        'sort_order' => $row['sort_order'] ?? ($index + 1),
                    ]);
                    continue;
                }

                LandingPageRole::create([
                    'title' => $row['title'],
                    'desc_text' => $row['desc_text'],
                    'features' => $row['features'],
                    'progress' => $row['progress'],
                    'icon_type' => $row['icon_type'],
                    'sort_order' => $row['sort_order'] ?? ($index + 1),
                    'is_active' => true,
                ]);
            }

            $orderedIds = LandingPageRole::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->pluck('id')
                ->values();

            foreach ($orderedIds as $position => $id) {
                LandingPageRole::query()
                    ->where('id', $id)
                    ->update(['sort_order' => $position + 1]);
            }
        });

        return back()->with('success', 'User Roles section updated successfully.');
    }

    public function updateHowItWorksSection(Request $request)
    {
        if (! Schema::hasTable('landing_page_how_it_works_sections') || ! Schema::hasTable('landing_page_how_it_works_steps')) {
            return back()->withErrors([
                'how_it_works_section' => 'How It Works section table is not available yet. Please run migrations first.',
            ]);
        }

        $validated = $request->validate([
            'badge_text' => 'required|string|max:120',
            'title_text' => 'required|string|max:255',
            'subtitle_text' => 'required|string|max:1000',
            'steps' => 'nullable|array',
            'steps.*.id' => 'nullable|integer|exists:landing_page_how_it_works_steps,id',
            'steps.*.step_number' => 'required|string|max:10',
            'steps.*.title' => 'required|string|max:150',
            'steps.*.subtitle' => 'required|string|max:500',
            'steps.*.sort_order' => 'nullable|integer|min:0|max:9999',
            'delete_ids' => 'nullable|array',
            'delete_ids.*' => 'integer|exists:landing_page_how_it_works_steps,id',
        ]);

        $stepsPayload = collect($validated['steps'] ?? [])
            ->map(fn(array $row, int $index) => [
                'id' => $row['id'] ?? null,
                'step_number' => trim((string) ($row['step_number'] ?? '')),
                'title' => trim((string) ($row['title'] ?? '')),
                'subtitle' => trim((string) ($row['subtitle'] ?? '')),
                'sort_order' => $row['sort_order'] ?? ($index + 1),
            ])
            ->values();
        $deleteIds = collect($validated['delete_ids'] ?? [])->filter()->values();
        $ids = $stepsPayload->pluck('id')->filter()->values();
        $stepsById = LandingPageHowItWorksStep::query()
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        DB::transaction(function () use ($validated, $stepsPayload, $deleteIds, $stepsById) {
            $section = LandingPageHowItWorksSection::query()->first();
            if (! $section) {
                $section = LandingPageHowItWorksSection::query()->create(self::DEFAULT_HOW_IT_WORKS_SECTION);
            }

            $section->update([
                'badge_text' => $validated['badge_text'],
                'title_text' => $validated['title_text'],
                'subtitle_text' => $validated['subtitle_text'],
            ]);

            if ($deleteIds->isNotEmpty()) {
                LandingPageHowItWorksStep::query()
                    ->whereIn('id', $deleteIds)
                    ->delete();
            }

            foreach ($stepsPayload as $index => $row) {
                if (isset($row['id']) && $deleteIds->contains($row['id'])) {
                    continue;
                }

                if (! empty($row['id'])) {
                    $step = $stepsById->get($row['id']);
                    if (! $step) {
                        continue;
                    }

                    $step->update([
                        'step_number' => $row['step_number'],
                        'title' => $row['title'],
                        'subtitle' => $row['subtitle'],
                        'sort_order' => $row['sort_order'] ?? ($index + 1),
                    ]);
                    continue;
                }

                LandingPageHowItWorksStep::create([
                    'step_number' => $row['step_number'],
                    'title' => $row['title'],
                    'subtitle' => $row['subtitle'],
                    'sort_order' => $row['sort_order'] ?? ($index + 1),
                    'is_active' => true,
                ]);
            }

            $orderedIds = LandingPageHowItWorksStep::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->pluck('id')
                ->values();

            foreach ($orderedIds as $position => $id) {
                LandingPageHowItWorksStep::query()
                    ->where('id', $id)
                    ->update(['sort_order' => $position + 1]);
            }
        });

        return back()->with('success', 'How It Works section updated successfully.');
    }

    public function updateTestimonialsSection(Request $request)
    {
        if (! Schema::hasTable('landing_page_testimonial_sections')) {
            return back()->withErrors([
                'testimonials_section' => 'Testimonials section table is not available yet. Please run migrations first.',
            ]);
        }

        $validated = $request->validate([
            'badge_text' => 'required|string|max:120',
            'title_text' => 'required|string|max:255',
        ]);

        $section = LandingPageTestimonialSection::query()->first();
        if (! $section) {
            $section = LandingPageTestimonialSection::query()->create(self::DEFAULT_TESTIMONIAL_SECTION);
        }

        $section->update([
            'badge_text' => $validated['badge_text'],
            'title_text' => $validated['title_text'],
        ]);

        return back()->with('success', 'Testimonials section updated successfully.');
    }

    public function updateTestimonialStatus(Request $request, LandingPageTestimonial $landingPageTestimonial)
    {
        if (! Schema::hasTable('landing_page_testimonials')) {
            return back()->withErrors([
                'testimonials_section' => 'Testimonials table is not available yet. Please run migrations first.',
            ]);
        }

        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
        ]);

        if ((string) $landingPageTestimonial->status === (string) $validated['status']) {
            return back()->with('success', 'Testimonial is already marked as ' . $validated['status'] . '.');
        }

        $landingPageTestimonial->update([
            'status' => $validated['status'],
        ]);

        return back()->with('success', 'Testimonial status updated successfully.');
    }

    private function rolesSectionData(): array
    {
        $defaultRoles = collect(self::DEFAULT_ROLES)
            ->map(fn(array $role) => [
                'id' => null,
                'title' => $role['title'],
                'desc_text' => $role['desc_text'],
                'features' => $role['features'],
                'progress' => $role['progress'],
                'icon_type' => $role['icon_type'],
                'sort_order' => $role['sort_order'],
            ])
            ->values()
            ->all();

        if (! Schema::hasTable('landing_page_roles_section') || ! Schema::hasTable('landing_page_roles')) {
            return [
                ...self::DEFAULT_ROLES_SECTION,
                'roles' => $defaultRoles,
            ];
        }

        $section = LandingPageRolesSection::query()->first();
        $roles = LandingPageRole::query()
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'title', 'desc_text', 'features', 'progress', 'icon_type', 'sort_order'])
            ->map(fn(LandingPageRole $role) => [
                'id' => $role->id,
                'title' => $role->title,
                'desc_text' => $role->desc_text,
                'features' => $role->features ?? [],
                'progress' => $role->progress,
                'icon_type' => $role->icon_type,
                'sort_order' => $role->sort_order,
            ])
            ->values()
            ->all();

        return [
            'badge_text' => $section?->badge_text ?: self::DEFAULT_ROLES_SECTION['badge_text'],
            'title_text' => $section?->title_text ?: self::DEFAULT_ROLES_SECTION['title_text'],
            'subtitle_text' => $section?->subtitle_text ?: self::DEFAULT_ROLES_SECTION['subtitle_text'],
            'roles' => count($roles) > 0 ? $roles : $defaultRoles,
        ];
    }

    private function howItWorksSectionData(): array
    {
        $defaultSteps = collect(self::DEFAULT_HOW_IT_WORKS_STEPS)
            ->map(fn(array $step) => [
                'id' => null,
                'step_number' => $step['step_number'],
                'title' => $step['title'],
                'subtitle' => $step['subtitle'],
                'sort_order' => $step['sort_order'],
            ])
            ->values()
            ->all();

        if (! Schema::hasTable('landing_page_how_it_works_sections') || ! Schema::hasTable('landing_page_how_it_works_steps')) {
            return [
                ...self::DEFAULT_HOW_IT_WORKS_SECTION,
                'steps' => $defaultSteps,
            ];
        }

        $section = LandingPageHowItWorksSection::query()->first();
        $steps = LandingPageHowItWorksStep::query()
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'step_number', 'title', 'subtitle', 'sort_order'])
            ->map(fn(LandingPageHowItWorksStep $step) => [
                'id' => $step->id,
                'step_number' => $step->step_number,
                'title' => $step->title,
                'subtitle' => $step->subtitle,
                'sort_order' => $step->sort_order,
            ])
            ->values()
            ->all();

        return [
            'badge_text' => $section?->badge_text ?: self::DEFAULT_HOW_IT_WORKS_SECTION['badge_text'],
            'title_text' => $section?->title_text ?: self::DEFAULT_HOW_IT_WORKS_SECTION['title_text'],
            'subtitle_text' => $section?->subtitle_text ?: self::DEFAULT_HOW_IT_WORKS_SECTION['subtitle_text'],
            'steps' => count($steps) > 0 ? $steps : $defaultSteps,
        ];
    }

    private function testimonialsSectionData(): array
    {
        $defaultTestimonials = [
            [
                'id' => null,
                'feedback' => 'This system has revolutionized our evaluation process. The holistic approach provides invaluable insights we never had before.',
                'first_name' => 'Maria',
                'last_name' => 'Santos',
                'role' => 'Dean of Engineering',
                'profile_photo_path' => null,
                'status' => 'approved',
                'created_at' => null,
            ],
            [
                'id' => null,
                'feedback' => 'The peer evaluation feature has fostered continuous improvement. I can track my growth with actionable feedback.',
                'first_name' => 'Juan',
                'last_name' => 'Cruz',
                'role' => 'Faculty Member',
                'profile_photo_path' => null,
                'status' => 'approved',
                'created_at' => null,
            ],
            [
                'id' => null,
                'feedback' => 'Managing evaluations across campuses is now seamless. The analytics dashboard provides real-time insights.',
                'first_name' => 'Ana',
                'last_name' => 'Reyes',
                'role' => 'Administrator',
                'profile_photo_path' => null,
                'status' => 'approved',
                'created_at' => null,
            ],
        ];

        if (! Schema::hasTable('landing_page_testimonial_sections') || ! Schema::hasTable('landing_page_testimonials')) {
            return [
                ...self::DEFAULT_TESTIMONIAL_SECTION,
                'testimonials' => $defaultTestimonials,
            ];
        }

        $section = LandingPageTestimonialSection::query()->first();
        $testimonials = LandingPageTestimonial::query()
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->limit(10)
            ->get(['id', 'feedback', 'first_name', 'last_name', 'role', 'profile_photo_path', 'status', 'created_at'])
            ->map(fn(LandingPageTestimonial $testimonial) => [
                'id' => $testimonial->id,
                'feedback' => $testimonial->feedback,
                'first_name' => $testimonial->first_name,
                'last_name' => $testimonial->last_name,
                'role' => $testimonial->role,
                'profile_photo_path' => $testimonial->profile_photo_path,
                'status' => $testimonial->status,
                'created_at' => optional($testimonial->created_at)->format('Y-m-d H:i:s'),
            ])
            ->values()
            ->all();

        return [
            'badge_text' => $section?->badge_text ?: self::DEFAULT_TESTIMONIAL_SECTION['badge_text'],
            'title_text' => $section?->title_text ?: self::DEFAULT_TESTIMONIAL_SECTION['title_text'],
            'testimonials' => count($testimonials) > 0 ? $testimonials : $defaultTestimonials,
        ];
    }

    private function storeLogoFile(UploadedFile $file): string
    {
        $path = $file->store('landing-page/logos', 'public');
        return Storage::url($path);
    }

    private function storeBackgroundVideo(UploadedFile $file): string
    {
        $path = $file->store('landing-page/videos', 'public');
        return Storage::url($path);
    }

    private function homeSectionData(): array
    {
        if (! Schema::hasTable('landing_page_home_sections')) {
            return self::DEFAULT_HOME_SECTION;
        }

        $homeSection = LandingPageHomeSection::query()->first();
        if (! $homeSection) {
            return self::DEFAULT_HOME_SECTION;
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

    private function statsSectionData(): array
    {
        $defaults = $this->defaultStatsWithValues();

        if (! Schema::hasTable('landing_page_stats')) {
            return array_values($defaults);
        }

        $rows = LandingPageStat::query()
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'stat_key', 'label', 'sort_order'])
            ->map(function (LandingPageStat $stat) use ($defaults) {
                $base = $defaults[$stat->stat_key] ?? null;

                return [
                    'id' => $stat->id,
                    'stat_key' => $stat->stat_key,
                    'label' => $stat->label ?: ($base['label'] ?? Str::headline($stat->stat_key)),
                    'value' => $base['value'] ?? 0,
                    'icon' => $base['icon'] ?? 'dashboard',
                    'sort_order' => $stat->sort_order,
                ];
            })
            ->values()
            ->all();

        return count($rows) > 0 ? $rows : array_values($defaults);
    }

    private function featureSectionData(): array
    {
        $defaultFeatures = collect(self::DEFAULT_FEATURES)
            ->map(fn(array $feature) => [
                'id' => null,
                'title' => $feature['title'],
                'subtitle' => $feature['subtitle'],
                'sort_order' => $feature['sort_order'],
            ])
            ->values()
            ->all();

        if (! Schema::hasTable('landing_page_feature_sections') || ! Schema::hasTable('landing_page_features')) {
            return [
                ...self::DEFAULT_FEATURE_SECTION,
                'features' => $defaultFeatures,
            ];
        }

        $section = LandingPageFeatureSection::query()->first();
        $features = LandingPageFeature::query()
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'title', 'subtitle', 'sort_order'])
            ->map(fn(LandingPageFeature $feature) => [
                'id' => $feature->id,
                'title' => $feature->title,
                'subtitle' => $feature->subtitle,
                'sort_order' => $feature->sort_order,
            ])
            ->values()
            ->all();

        return [
            'badge_text' => $section?->badge_text ?: self::DEFAULT_FEATURE_SECTION['badge_text'],
            'title_text' => $section?->title_text ?: self::DEFAULT_FEATURE_SECTION['title_text'],
            'subtitle_text' => $section?->subtitle_text ?: self::DEFAULT_FEATURE_SECTION['subtitle_text'],
            'features' => count($features) > 0 ? $features : $defaultFeatures,
        ];
    }

    private function defaultStatsWithValues(): array
    {
        $evaluations = Schema::hasTable('evaluation_submissions')
            ? DB::table('evaluation_submissions')->count()
            : 0;

        return collect(self::DEFAULT_STATS)
            ->map(function (array $config, string $statKey) use ($evaluations) {
                $value = $statKey === 'evaluations'
                    ? $evaluations
                    : $this->activeCount((string) $config['source']);

                return [
                    'id' => null,
                    'stat_key' => $statKey,
                    'label' => $config['label'],
                    'value' => $value,
                    'icon' => $config['icon'],
                    'sort_order' => $config['sort_order'],
                ];
            })
            ->all();
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

    private function deleteManagedLogoIfExists(?string $target): void
    {
        if (blank($target)) {
            return;
        }

        $targetString = (string) $target;
        if (! Str::startsWith($targetString, '/storage/')) {
            return;
        }

        $path = Str::after($targetString, '/storage/');
        if ($path !== '') {
            Storage::disk('public')->delete($path);
        }
    }

    private function deleteManagedVideoIfExists(?string $target): void
    {
        if (blank($target)) {
            return;
        }

        $targetString = (string) $target;
        if (! Str::startsWith($targetString, '/storage/')) {
            return;
        }

        $path = Str::after($targetString, '/storage/');
        if ($path !== '') {
            Storage::disk('public')->delete($path);
        }
    }
}
