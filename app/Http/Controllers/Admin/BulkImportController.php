<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BulkImportController extends Controller
{
    public function students(Request $request): RedirectResponse
    {
        return $this->import($request, 'student', [
            'first_name'    => 'firstname',
            'middle_name'   => 'middlename',
            'last_name'     => 'lastname',
            'email'         => 'email',
            'branch'        => 'branch_id',
            'department'    => 'department_id',
            'program'       => 'program_id',
            'strand'        => 'strand_id',
            'year_level'    => 'education_level_id',
            'password'      => 'password',
            'status'        => 'status',
        ], 'student');
    }

    public function teachers(Request $request): RedirectResponse
    {
        return $this->import($request, 'teacher', [
            'first_name'    => 'firstname',
            'middle_name'   => 'middlename',
            'last_name'     => 'lastname',
            'email'         => 'email',
            'role'          => 'role',
            'branch'        => 'branch_id',
            'department'    => 'department_id',
            'program'       => 'program_id',
            'strand'        => 'strand_id',
            'password'      => 'password',
        ], 'teacher');
    }

    public function employees(Request $request): RedirectResponse
    {
        return $this->import($request, 'employee', [
            'first_name'    => 'firstname',
            'middle_name'   => 'middlename',
            'last_name'     => 'lastname',
            'email'         => 'email',
            'role'          => 'role',
            'branch'        => 'branch_id',
            'employee_department' => 'employee_department_id',
            'department'    => 'department_id',
            'password'      => 'password',
        ], 'employee');
    }

    private function import(Request $request, string $table, array $columnMap, ?string $autoGenerateCodeFor = null): RedirectResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $path = $request->file('file')->getRealPath();
        $handle = fopen($path, 'r');
        if (! $handle) {
            return back()->withErrors(['file' => 'Unable to read uploaded file.']);
        }

        $header = fgetcsv($handle);
        if (! $header) {
            fclose($handle);
            return back()->withErrors(['file' => 'CSV is empty or missing a header row.']);
        }

        $header = array_map(fn ($h) => $this->normalizeCsvHeader($h), $header);
        $created = 0;
        $skipped = 0;
        $errors  = [];
        $rowNum  = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;
            $assoc = array_combine($header, array_pad($row, count($header), null));
            if (! $assoc) { $skipped++; continue; }

            $payload = [];
            foreach ($columnMap as $csvCol => $dbCol) {
                $csvCol = $this->normalizeCsvHeader($csvCol);
                $payload[$dbCol] = $this->csvValue($assoc, $csvCol, $dbCol);
            }

            if ($scopedBranchId = $this->scopedBranchId()) {
                $payload['branch_id'] = $scopedBranchId;
            }

            if ($autoGenerateCodeFor) {
                $payload = $this->resolveImportReferences($payload, $autoGenerateCodeFor);
                $payload['code'] = $this->generateAccountCode($table, $autoGenerateCodeFor, $payload['branch_id'] ? (int) $payload['branch_id'] : null);
            }

            $validator = Validator::make($payload, [
                'code'      => "required|string|max:50|unique:{$table},code",
                'firstname' => 'required|string|max:100',
                'lastname'  => 'required|string|max:100',
                'email'     => "required|email|max:150|unique:{$table},email",
                'branch_id' => 'nullable|integer|exists:branch,id',
            ]);

            if ($validator->fails()) {
                $skipped++;
                $errors[] = "Row {$rowNum}: " . implode('; ', $validator->errors()->all());
                continue;
            }

            $password = trim((string) ($payload['password'] ?? ''));
            $payload['password'] = \App\Services\LegacyHash::make($password !== '' ? $password : 'hcc1234');
            $status = strtolower((string) ($payload['status'] ?? 'active'));
            unset($payload['status']);

            $payload['is_activated'] = in_array($status, ['inactive', 'disabled', '0'], true) ? 0 : 1;
            $payload['is_deleted']   = 0;
            $payload['created_at']   = now();
            $payload['updated_at']   = now();

            try {
                DB::table($table)->insert($payload);
                $created++;
            } catch (\Throwable $e) {
                $skipped++;
                $errors[] = "Row {$rowNum}: " . $e->getMessage();
            }
        }

        fclose($handle);

        $msg = "Imported {$created} rows, skipped {$skipped}.";
        return back()
            ->with('success', $msg)
            ->with('import_errors', array_slice($errors, 0, 25));
    }

    private function normalizeCsvHeader(mixed $header): string
    {
        $normalized = strtolower(trim((string) $header));
        $normalized = preg_replace('/[^a-z0-9]+/', '_', $normalized) ?? '';

        return trim($normalized, '_');
    }

    private function csvValue(array $assoc, string $csvCol, string $dbCol): ?string
    {
        $aliases = [
            'education_level_id' => ['year_level_id'],
        ];

        foreach (array_unique([$csvCol, $dbCol, ...($aliases[$dbCol] ?? [])]) as $key) {
            $key = $this->normalizeCsvHeader($key);

            if (isset($assoc[$key]) && trim((string) $assoc[$key]) !== '') {
                return trim((string) $assoc[$key]);
            }
        }

        return null;
    }

    private function resolveImportReferences(array $payload, string $type): array
    {
        $payload['branch_id'] = $this->resolveReference('branch', $payload['branch_id'] ?? null);
        $payload['department_id'] = $this->resolveReference('department', $payload['department_id'] ?? null, [
            'branch_id' => $payload['branch_id'] ?? null,
        ]);

        if ($type === 'employee') {
            $payload['employee_department_id'] = $this->resolveReference('employee_department', $payload['employee_department_id'] ?? null, [
                'branch_id' => $payload['branch_id'] ?? null,
            ]);
        }

        $payload['program_id'] = $this->resolveReference('program', $payload['program_id'] ?? null, [
            'department_id' => $payload['department_id'] ?? null,
        ]);
        $payload['strand_id'] = $this->resolveReference('strand', $payload['strand_id'] ?? null, [
            'department_id' => $payload['department_id'] ?? null,
        ]);

        if ($type === 'student') {
            $payload['education_level_id'] = $this->resolveYearLevel($payload['education_level_id'] ?? null, [
                'department_id' => $payload['department_id'] ?? null,
                'program_id' => $payload['program_id'] ?? null,
                'strand_id' => $payload['strand_id'] ?? null,
            ]);
        }

        return $payload;
    }

    private function resolveReference(string $table, mixed $value, array $scope = []): ?int
    {
        $value = trim((string) ($value ?? ''));

        if ($value === '') {
            return null;
        }

        if (ctype_digit($value)) {
            return (int) $value;
        }

        $normalized = $this->normalizeLookupValue($value);
        $query = DB::table($table)
            ->where('is_deleted', 0);

        foreach ($scope as $column => $id) {
            if ($id) {
                if ($table === 'employee_department' && $column === 'branch_id') {
                    $query->where(fn ($sub) => $sub->whereNull('branch_id')->orWhere('branch_id', $id));
                } else {
                    $query->where($column, $id);
                }
            }
        }

        $matches = $query
            ->where(function ($query) use ($value, $normalized) {
                $query->whereRaw('LOWER(name) = ?', [strtolower($value)])
                    ->orWhereRaw('LOWER(code) = ?', [strtolower($value)])
                    ->orWhereRaw("LOWER(REPLACE(REPLACE(name, ' - Santa Rosa', ''), ' - Concepcion', '')) = ?", [$normalized]);
            })
            ->pluck('id');

        return $matches->count() === 1 ? (int) $matches->first() : null;
    }

    private function resolveYearLevel(mixed $value, array $scope = []): ?int
    {
        $value = trim((string) ($value ?? ''));

        if ($value === '') {
            return null;
        }

        if (ctype_digit($value)) {
            return (int) $value;
        }

        $normalized = $this->normalizeLookupValue($value);
        $query = DB::table('education_level')
            ->where('is_deleted', 0);

        foreach ($scope as $column => $id) {
            if ($id) {
                $query->where($column, $id);
            }
        }

        $matches = $query->get(['id', 'year_level', 'section'])
            ->filter(function ($level) use ($normalized) {
                $year = trim((string) $level->year_level);
                $section = trim((string) $level->section);

                return in_array($normalized, array_filter([
                    $this->normalizeLookupValue($year),
                    $this->normalizeLookupValue($section),
                    $this->normalizeLookupValue(trim($year . ' - ' . $section, ' -')),
                    $this->normalizeLookupValue(trim('Grade ' . $year . ' - ' . $section, ' -')),
                    $this->normalizeLookupValue(trim($year . ' ' . $section)),
                ]), true);
            })
            ->pluck('id');

        return $matches->count() === 1 ? (int) $matches->first() : null;
    }

    private function normalizeLookupValue(string $value): string
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', preg_replace('/\s*-\s*(Santa Rosa|Concepcion)\s*$/i', '', $value)) ?? ''));
    }

    private function generateAccountCode(string $table, string $type, ?int $branchId = null): string
    {
        $codePrefix = match ($type) {
            'teacher' => 'TCH',
            'employee' => 'EMP',
            default => 'STU',
        };

        if ($branchId === null) {
            $prefix = $codePrefix . '-GEN-';
        } else {
            $branchCode = DB::table('branch')->where('id', $branchId)->value('code');
            $branchCode = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $branchCode));
            $prefix = $codePrefix . '-' . ($branchCode !== '' ? $branchCode : 'GEN') . '-';
        }

        $lastCode = DB::table($table)
            ->where('code', 'like', $prefix . '%')
            ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
            ->orderByDesc('id')
            ->value('code');

        $lastNumber = 0;

        if ($lastCode && preg_match('/(\d+)$/', $lastCode, $matches)) {
            $lastNumber = (int) $matches[1];
        }

        return $prefix . str_pad((string) ($lastNumber + 1), 5, '0', STR_PAD_LEFT);
    }
}
