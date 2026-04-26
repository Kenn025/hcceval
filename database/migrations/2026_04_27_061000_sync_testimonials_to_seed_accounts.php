<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('landing_page_testimonials')) {
            return;
        }

        $teacher = DB::table('teacher')
            ->where('email', 't1_sr@mail.com')
            ->where('is_deleted', 0)
            ->first(['id', 'firstname', 'lastname', 'role', 'profile_photo_path']);
        $admin = DB::table('admin')
            ->where('email', 'admin_sr@hcc.com')
            ->where('is_deleted', 0)
            ->first(['id', 'name', 'role']);
        $student = DB::table('student')
            ->where('email', 's1_sr@mail.com')
            ->where('is_deleted', 0)
            ->first(['id', 'firstname', 'lastname', 'profile_photo_path']);
        $employee = DB::table('employee')
            ->whereIn('email', ['employeee1_sr@mail.com', 'e1_sr@mail.com'])
            ->where('is_deleted', 0)
            ->first(['id', 'firstname', 'lastname', 'role', 'profile_photo_path']);

        $records = [];
        if ($teacher) {
            $records[] = [
                'submitted_by_type' => 'teacher',
                'submitted_by_id' => (int) $teacher->id,
                'first_name' => (string) ($teacher->firstname ?? 'Teacher'),
                'last_name' => (string) ($teacher->lastname ?? ''),
                'role' => (string) ($teacher->role ?? 'Faculty'),
                'profile_photo_path' => $this->normalizePhotoPath($teacher->profile_photo_path),
                'feedback' => 'The peer evaluation feature has fostered continuous improvement. I can track my growth with actionable feedback.',
            ];
        }
        if ($admin) {
            [$firstName, $lastName] = $this->splitName((string) ($admin->name ?? 'Admin'));
            $records[] = [
                'submitted_by_type' => 'admin',
                'submitted_by_id' => (int) $admin->id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'role' => (string) ($admin->role ?? 'Admin'),
                'profile_photo_path' => null,
                'feedback' => 'Managing evaluations across campuses is now seamless. The analytics dashboard provides real-time insights.',
            ];
        }
        if ($student) {
            $records[] = [
                'submitted_by_type' => 'student',
                'submitted_by_id' => (int) $student->id,
                'first_name' => (string) ($student->firstname ?? 'Student'),
                'last_name' => (string) ($student->lastname ?? ''),
                'role' => 'Student',
                'profile_photo_path' => $this->normalizePhotoPath($student->profile_photo_path),
                'feedback' => 'The dashboard is easy to use, and submitting evaluations is fast and clear every semester.',
            ];
        }
        if ($employee) {
            $records[] = [
                'submitted_by_type' => 'employee',
                'submitted_by_id' => (int) $employee->id,
                'first_name' => (string) ($employee->firstname ?? 'Employee'),
                'last_name' => (string) ($employee->lastname ?? ''),
                'role' => (string) ($employee->role ?? 'Employee'),
                'profile_photo_path' => $this->normalizePhotoPath($employee->profile_photo_path),
                'feedback' => 'I can now submit service feedback smoothly, and the process stays organized across terms.',
            ];
        }

        if (count($records) === 0) {
            return;
        }

        DB::table('landing_page_testimonials')
            ->where('submitted_by_type', 'manual')
            ->delete();

        foreach ($records as $index => $record) {
            $existing = DB::table('landing_page_testimonials')
                ->where('submitted_by_type', $record['submitted_by_type'])
                ->where('submitted_by_id', $record['submitted_by_id'])
                ->first(['id']);

            $payload = [
                ...$record,
                'status' => 'approved',
                'sort_order' => $index + 1,
                'is_active' => 1,
                'updated_at' => now(),
            ];

            if ($existing) {
                DB::table('landing_page_testimonials')
                    ->where('id', $existing->id)
                    ->update($payload);
                continue;
            }

            DB::table('landing_page_testimonials')->insert([
                ...$payload,
                'created_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Intentionally no-op to preserve testimonial history.
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

    private function normalizePhotoPath(?string $path): ?string
    {
        $value = trim((string) ($path ?? ''));
        if ($value === '') {
            return null;
        }

        if (
            str_starts_with($value, 'http://') ||
            str_starts_with($value, 'https://') ||
            str_starts_with($value, '/')
        ) {
            return $value;
        }

        return '/storage/' . ltrim($value, '/');
    }
};
