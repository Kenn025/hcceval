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
            'student_no'    => 'code',
            'first_name'    => 'firstname',
            'middle_name'   => 'middlename',
            'last_name'     => 'lastname',
            'email'         => 'email',
            'branch_id'     => 'branch_id',
            'department_id' => 'department_id',
            'program_id'    => 'program_id',
            'year_level_id' => 'education_level_id',
        ]);
    }

    public function teachers(Request $request): RedirectResponse
    {
        return $this->import($request, 'teacher', [
            'employee_no'   => 'code',
            'first_name'    => 'firstname',
            'middle_name'   => 'middlename',
            'last_name'     => 'lastname',
            'email'         => 'email',
            'role'          => 'role',
            'branch_id'     => 'branch_id',
            'department_id' => 'department_id',
            'program_id'    => 'program_id',
        ]);
    }

    public function employees(Request $request): RedirectResponse
    {
        return $this->import($request, 'employee', [
            'employee_no'   => 'code',
            'first_name'    => 'firstname',
            'middle_name'   => 'middlename',
            'last_name'     => 'lastname',
            'email'         => 'email',
            'role'          => 'role',
            'branch_id'     => 'branch_id',
            'department_id' => 'department_id',
        ]);
    }

    private function import(Request $request, string $table, array $columnMap): RedirectResponse
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

        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);
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
                $payload[$dbCol] = isset($assoc[$csvCol]) && $assoc[$csvCol] !== ''
                    ? trim((string) $assoc[$csvCol])
                    : null;
            }

            $validator = Validator::make($payload, [
                'code'      => "required|string|max:50|unique:{$table},code",
                'firstname' => 'required|string|max:100',
                'lastname'  => 'required|string|max:100',
                'email'     => "nullable|email|max:150|unique:{$table},email",
                'branch_id' => 'nullable|integer|exists:branch,id',
            ]);

            if ($validator->fails()) {
                $skipped++;
                $errors[] = "Row {$rowNum}: " . implode('; ', $validator->errors()->all());
                continue;
            }

            $payload['password']     = md5('hcc1234');
            $payload['is_activated'] = 1;
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
}
