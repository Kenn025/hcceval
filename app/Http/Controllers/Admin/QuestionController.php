<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class QuestionController extends Controller
{
    private function generateQuestionCode(?int $ignoreId = null): string
    {
        $lastCode = DB::table('question')
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->where('code', 'like', 'Q-%')
            ->orderByDesc('id')
            ->value('code');

        $lastNumber = 0;

        if ($lastCode && preg_match('/Q-(\d+)$/', $lastCode, $matches)) {
            $lastNumber = (int) $matches[1];
        }

        return 'Q-' . str_pad((string) ($lastNumber + 1), 3, '0', STR_PAD_LEFT);
    }

    private function getQuestions(string $search = '', ?int $questionClassId = null, ?int $questionTypeId = null)
    {
        return DB::table('question')
            ->leftJoin('question_type as qt', 'qt.id', '=', 'question.question_type_id')
            ->leftJoin('question_class as qc', 'qc.id', '=', 'question.question_class_id')
            ->select(
                'question.id as question_id',
                'question.code as question_code',
                'question.description as question_text',
                'question.question_type_id',
                'qt.name as question_type_name',
                'question.question_class_id',
                'qc.name as question_class_name',
                'question.is_required',
                'question.is_activated as is_active',
                'question.is_deleted'
            )
            ->where('question.is_deleted', 0)
            ->when($questionClassId, fn ($q) => $q->where('question.question_class_id', $questionClassId))
            ->when($questionTypeId, fn ($q) => $q->where('question.question_type_id', $questionTypeId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('question.description', 'like', "%{$search}%")
                    ->orWhere('question.code', 'like', "%{$search}%")
                    ->orWhere('qt.name', 'like', "%{$search}%")
                    ->orWhere('qc.name', 'like', "%{$search}%");
            }))
            ->orderBy('question.code')
            ->paginate(15)
            ->withQueryString();
    }

    private function getQuestionTypes()
    {
        return DB::table('question_type')
            ->select('id', 'code', 'name')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('name')
            ->get();
    }

    private function getQuestionClasses()
    {
        return DB::table('question_class')
            ->select('id', 'code', 'name')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('name')
            ->get();
    }

    private function renderQuestionPage(Request $request, string $routeName, string $title, string $description)
    {
        $search = $request->input('search', '');
        $questionClassId = $request->integer('question_class_id') ?: null;
        $questionTypeId = $request->integer('question_type_id') ?: null;

        return Inertia::render('Admin/Questions', [
            'questions' => $this->getQuestions($search, $questionClassId, $questionTypeId),
            'questionTypes' => $this->getQuestionTypes(),
            'questionClasses' => $this->getQuestionClasses(),
            'nextQuestionCode' => $this->generateQuestionCode(),
            'filters' => [
                'search' => $search,
                'question_class_id' => $questionClassId,
                'question_type_id' => $questionTypeId,
            ],
            'routeName' => $routeName,
            'title' => $title,
            'description' => $description,
        ]);
    }

    public function index(Request $request)
    {
        return $this->renderQuestionPage(
            $request,
            'admin.questions',
            'Questions',
            'Store and manage reusable evaluation questions with question codes and question types.'
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'question_type_id' => 'required|exists:question_type,id',
            'question_class_id' => 'required|exists:question_class,id',
            'question_text' => 'required|string|max:1000',
            'is_active'     => 'boolean',
        ]);

        DB::table('question')->insert([
            'code'             => $this->generateQuestionCode(),
            'description'      => $validated['question_text'],
            'question_type_id' => $validated['question_type_id'],
            'question_class_id' => $validated['question_class_id'],
            'is_required'      => 1,
            'is_activated'     => ! empty($validated['is_active']) ? 1 : 0,
            'is_deleted'       => 0,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        return back()->with('success', 'Question created.');
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $handle = fopen($request->file('file')->getRealPath(), 'r');
        if (! $handle) {
            return back()->withErrors(['file' => 'Unable to read uploaded file.']);
        }

        $header = fgetcsv($handle);
        if (! $header) {
            fclose($handle);
            return back()->withErrors(['file' => 'CSV is empty or missing a header row.']);
        }

        $header = array_map(fn ($value) => $this->normalizeCsvHeader($value), $header);
        $created = 0;
        $skipped = 0;
        $errors = [];
        $rowNum = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;
            $assoc = array_combine($header, array_pad($row, count($header), null));
            if (! $assoc) {
                $skipped++;
                continue;
            }

            $questionText = trim((string) ($this->csvValue($assoc, ['question_text', 'question']) ?? ''));
            $typeValue = trim((string) ($this->csvValue($assoc, ['question_type', 'question_type_id', 'type']) ?? ''));
            $classValue = trim((string) ($this->csvValue($assoc, ['question_class', 'question_class_id', 'class']) ?? ''));
            $statusValue = strtolower(trim((string) ($this->csvValue($assoc, ['status', 'is_active']) ?? 'active')));

            $typeId = $this->resolveQuestionReference('question_type', $typeValue);
            $classId = $this->resolveQuestionReference('question_class', $classValue);

            $rowErrors = [];
            if ($questionText === '') {
                $rowErrors[] = 'Question Text is required.';
            }
            if (! $typeId) {
                $rowErrors[] = 'Question Type was not found.';
            }
            if (! $classId) {
                $rowErrors[] = 'Question Class was not found.';
            }

            if ($rowErrors) {
                $skipped++;
                $errors[] = "Row {$rowNum}: " . implode(' ', $rowErrors);
                continue;
            }

            DB::table('question')->insert([
                'code' => $this->generateQuestionCode(),
                'description' => $questionText,
                'question_type_id' => $typeId,
                'question_class_id' => $classId,
                'is_required' => 1,
                'is_activated' => in_array($statusValue, ['inactive', 'disabled', '0'], true) ? 0 : 1,
                'is_deleted' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $created++;
        }

        fclose($handle);

        return back()
            ->with('success', "Imported {$created} questions, skipped {$skipped}.")
            ->with('import_errors', array_slice($errors, 0, 25));
    }

    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'question_type_id' => 'required|exists:question_type,id',
            'question_class_id' => 'required|exists:question_class,id',
            'question_text' => 'required|string|max:1000',
            'is_active'     => 'boolean',
        ]);

        DB::table('question')->where('id', $id)->update([
            'description'  => $validated['question_text'],
            'question_type_id' => $validated['question_type_id'],
            'question_class_id' => $validated['question_class_id'],
            'is_activated' => ! empty($validated['is_active']) ? 1 : 0,
            'updated_at'   => now(),
        ]);

        return back()->with('success', 'Question updated.');
    }

    public function destroy(int $id)
    {
        DB::table('question')->where('id', $id)->update(['is_deleted' => 1, 'updated_at' => now()]);
        return back()->with('success', 'Question deleted.');
    }

    private function normalizeCsvHeader(mixed $header): string
    {
        $normalized = strtolower(trim((string) $header));
        $normalized = preg_replace('/[^a-z0-9]+/', '_', $normalized) ?? '';

        return trim($normalized, '_');
    }

    private function csvValue(array $assoc, array $keys): ?string
    {
        foreach ($keys as $key) {
            $key = $this->normalizeCsvHeader($key);

            if (isset($assoc[$key]) && trim((string) $assoc[$key]) !== '') {
                return trim((string) $assoc[$key]);
            }
        }

        return null;
    }

    private function resolveQuestionReference(string $table, string $value): ?int
    {
        if ($value === '') {
            return null;
        }

        if (ctype_digit($value)) {
            return (int) $value;
        }

        $normalized = strtolower(trim(preg_replace('/\s+/', ' ', $value) ?? ''));
        $matches = DB::table($table)
            ->where('is_deleted', 0)
            ->where(function ($query) use ($value, $normalized) {
                $query->whereRaw('LOWER(name) = ?', [strtolower($value)])
                    ->orWhereRaw('LOWER(code) = ?', [strtolower($value)])
                    ->orWhereRaw('LOWER(name) = ?', [$normalized]);
            })
            ->pluck('id');

        return $matches->count() === 1 ? (int) $matches->first() : null;
    }
}
