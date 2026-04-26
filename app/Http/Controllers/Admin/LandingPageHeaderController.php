<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LandingPageHeader;
use App\Models\LandingPageHomeSection;
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
                fn (array $row) => isset($row['id']) && $deleteIds->contains($row['id']),
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
