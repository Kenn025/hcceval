<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Employee;
use App\Models\LandingPageTestimonial;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class TestimonialFeedbackController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'feedback' => 'required|string|max:1000',
        ]);

        $actor = $this->resolveActor();
        if (! $actor) {
            return response()->json([
                'message' => 'You must be signed in to submit feedback.',
            ], 401);
        }

        if ($actor['source'] === 'admin' && Str::lower((string) ($actor['role'] ?? '')) === 'superadmin') {
            return response()->json([
                'message' => 'Super Admin accounts cannot submit testimonials from this form.',
            ], 403);
        }

        $sortOrder = (int) LandingPageTestimonial::query()->max('sort_order') + 1;

        $testimonial = LandingPageTestimonial::query()->create([
            'submitted_by_type' => $actor['source'],
            'submitted_by_id' => $actor['id'],
            'first_name' => $actor['first_name'],
            'last_name' => $actor['last_name'],
            'role' => $actor['display_role'],
            'profile_photo_path' => $actor['profile_photo_path'],
            'feedback' => trim((string) $validated['feedback']),
            'status' => 'pending',
            'sort_order' => $sortOrder,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Feedback submitted successfully.',
            'item' => $this->mapRecentFeedbackItem($testimonial),
        ]);
    }

    public function mine(): JsonResponse
    {
        $actor = $this->resolveActor();
        if (! $actor) {
            return response()->json([
                'message' => 'You must be signed in to view feedback.',
                'items' => [],
            ], 401);
        }

        if ($actor['source'] === 'admin' && Str::lower((string) ($actor['role'] ?? '')) === 'superadmin') {
            return response()->json([
                'items' => [],
            ]);
        }

        $items = LandingPageTestimonial::query()
            ->where('submitted_by_type', $actor['source'])
            ->where('submitted_by_id', $actor['id'])
            ->latest('id')
            ->limit(5)
            ->get()
            ->map(fn(LandingPageTestimonial $testimonial) => $this->mapRecentFeedbackItem($testimonial))
            ->values()
            ->all();

        return response()->json([
            'items' => $items,
        ]);
    }

    private function mapRecentFeedbackItem(LandingPageTestimonial $testimonial): array
    {
        return [
            'id' => $testimonial->id,
            'feedback' => $testimonial->feedback,
            'status' => Str::headline((string) $testimonial->status),
            'created_at' => optional($testimonial->created_at)?->format('Y-m-d H:i:s'),
        ];
    }

    private function resolveActor(): ?array
    {
        $adminId = session('admin_id');
        if ($adminId) {
            $admin = Admin::query()
                ->where('id', $adminId)
                ->where('is_deleted', 0)
                ->first(['id', 'name', 'role']);

            if (! $admin) {
                return null;
            }

            [$firstName, $lastName] = $this->splitName($admin->name ?? '');

            return [
                'source' => 'admin',
                'id' => (int) $admin->id,
                'role' => (string) ($admin->role ?? ''),
                'display_role' => $this->adminRoleLabel((string) ($admin->role ?? 'Admin')),
                'first_name' => $firstName,
                'last_name' => $lastName,
                'profile_photo_path' => null,
            ];
        }

        if (Auth::check() && session()->has('admin_role')) {
            $user = Auth::user();
            [$firstName, $lastName] = $this->splitName((string) ($user?->name ?? 'Admin'));
            $role = (string) session('admin_role', 'admin');

            return [
                'source' => 'admin_auth',
                'id' => (int) ($user?->id ?? 0),
                'role' => $role,
                'display_role' => $this->adminRoleLabel($role),
                'first_name' => $firstName,
                'last_name' => $lastName,
                'profile_photo_path' => null,
            ];
        }

        $clientSource = (string) session('client_source', '');
        $clientId = (int) session('client_id', 0);

        if ($clientId <= 0 || $clientSource === '') {
            return null;
        }

        if ($clientSource === 'student') {
            $student = Student::query()
                ->where('id', $clientId)
                ->where('is_deleted', 0)
                ->first(['id', 'firstname', 'lastname', 'profile_photo_path']);
            if (! $student) {
                return null;
            }

            return [
                'source' => 'student',
                'id' => (int) $student->id,
                'role' => 'Student',
                'display_role' => 'Student',
                'first_name' => (string) ($student->firstname ?? 'Student'),
                'last_name' => (string) ($student->lastname ?? ''),
                'profile_photo_path' => $this->normalizeProfilePhotoPath($student->profile_photo_path),
            ];
        }

        if ($clientSource === 'teacher') {
            $teacher = Teacher::query()
                ->where('id', $clientId)
                ->where('is_deleted', 0)
                ->first(['id', 'firstname', 'lastname', 'role', 'profile_photo_path']);
            if (! $teacher) {
                return null;
            }

            return [
                'source' => 'teacher',
                'id' => (int) $teacher->id,
                'role' => (string) ($teacher->role ?? 'Faculty'),
                'display_role' => (string) ($teacher->role ?? 'Faculty'),
                'first_name' => (string) ($teacher->firstname ?? 'Faculty'),
                'last_name' => (string) ($teacher->lastname ?? ''),
                'profile_photo_path' => $this->normalizeProfilePhotoPath($teacher->profile_photo_path),
            ];
        }

        if ($clientSource === 'employee') {
            $employee = Employee::query()
                ->where('id', $clientId)
                ->where('is_deleted', 0)
                ->first(['id', 'firstname', 'lastname', 'role', 'profile_photo_path']);
            if (! $employee) {
                return null;
            }

            return [
                'source' => 'employee',
                'id' => (int) $employee->id,
                'role' => (string) ($employee->role ?? 'Employee'),
                'display_role' => (string) ($employee->role ?? 'Employee'),
                'first_name' => (string) ($employee->firstname ?? 'Employee'),
                'last_name' => (string) ($employee->lastname ?? ''),
                'profile_photo_path' => $this->normalizeProfilePhotoPath($employee->profile_photo_path),
            ];
        }

        return null;
    }

    private function normalizeProfilePhotoPath(?string $path): ?string
    {
        $value = trim((string) ($path ?? ''));
        if ($value === '') {
            return null;
        }

        if (Str::startsWith($value, ['http://', 'https://', '/'])) {
            return $value;
        }

        return '/storage/' . ltrim($value, '/');
    }

    private function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $parts = array_values(array_filter($parts, fn($part) => trim((string) $part) !== ''));

        if (count($parts) <= 1) {
            return [$parts[0] ?? 'User', ''];
        }

        $first = array_shift($parts);
        $last = implode(' ', $parts);

        return [$first ?: 'User', $last];
    }

    private function adminRoleLabel(string $role): string
    {
        return match (Str::lower(trim($role))) {
            'superadmin' => 'Super Admin',
            'overalladmin' => 'Overall Admin',
            default => 'Admin',
        };
    }
}
