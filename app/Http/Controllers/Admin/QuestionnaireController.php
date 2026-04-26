<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class QuestionnaireController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search', '');

        $questionnaires = DB::table('questionnaires as q')
            ->leftJoin('branch as b', 'b.id', '=', 'q.branch_id')
            ->leftJoin('questionnaire_type as qt', 'qt.id', '=', 'q.questionnaire_type_id')
            ->leftJoin('question_choices as qc', 'qc.id', '=', 'q.question_choices_id')
            ->select(
                'q.id as questionnaire_id',
                'q.code as questionnaire_code',
                'q.title as questionnaire_title',
                'q.branch_id',
                'b.name as branch_name',
                'b.code as branch_code',
                'q.questionnaire_type_id',
                'q.question_choices_id',
                'qt.name as questionnaire_type_name',
                'qc.code as question_choices_code',
                'qc.name as question_choices_name',
                'qc.quantity as question_choices_quantity',
                'q.items',
                'q.comments',
                'q.notes',
                'q.is_activated as is_active',
                'q.is_deleted'
            )
            ->where('q.is_deleted', 0)
            ->when($search, fn ($query) => $query->where(function ($sub) use ($search) {
                $sub->where('q.code', 'like', "%{$search}%")
                    ->orWhere('q.title', 'like', "%{$search}%")
                    ->orWhere('b.name', 'like', "%{$search}%")
                    ->orWhere('b.code', 'like', "%{$search}%")
                    ->orWhere('qt.name', 'like', "%{$search}%")
                    ->orWhere('qc.code', 'like', "%{$search}%");
            }))
            ->orderByDesc('q.created_at')
            ->orderByDesc('q.id')
            ->paginate($request->input('per_page', 15))
            ->through(function ($row) {
                $payload = json_decode($row->items ?? '{}', true) ?: [];
                $legacyComments = json_decode($row->comments ?? '[]', true) ?: [];

                $scaleQuestions = is_array($payload['scale_questions'] ?? null) ? $payload['scale_questions'] : [];
                $commentSection = is_array($payload['comment_section']['questions'] ?? null)
                    ? $payload['comment_section']['questions']
                    : [];

                $classGroups = collect($scaleQuestions)
                    ->map(function ($group) {
                        return [
                            'question_class_name' => $group['class_name'] ?? '',
                            'weight' => (int) ($group['weight_percentage'] ?? 0),
                            'questions' => array_values($group['questions'] ?? []),
                        ];
                    })
                    ->values()
                    ->all();

                $commentQuestions = collect($commentSection)
                    ->map(fn ($question) => (int) ($question['question_id'] ?? 0))
                    ->filter()
                    ->values()
                    ->all();

                if (empty($classGroups) && is_array($payload)) {
                    $flatItems = array_values(array_filter($payload, fn ($item) => is_int($item) || ctype_digit((string) $item)));
                    if ($flatItems !== []) {
                        $classGroups = [[
                            'question_class_name' => '',
                            'weight' => 100,
                            'questions' => $flatItems,
                        ]];
                    }
                }

                if ($commentQuestions === [] && $legacyComments !== []) {
                    $commentQuestions = array_values($legacyComments);
                }

                return [
                    'questionnaire_id' => $row->questionnaire_id,
                    'questionnaire_code' => $row->questionnaire_code,
                    'questionnaire_title' => $row->questionnaire_title,
                    'branch_id' => $row->branch_id,
                    'branch_name' => $row->branch_name,
                    'branch_code' => $row->branch_code,
                    'questionnaire_type_id' => $row->questionnaire_type_id,
                    'question_choices_id' => $row->question_choices_id,
                    'questionnaire_type_name' => $row->questionnaire_type_name,
                    'question_choices_code' => $row->question_choices_code,
                    'question_choices_name' => $row->question_choices_name,
                    'question_choices_quantity' => $row->question_choices_quantity,
                    'class_groups' => $classGroups,
                    'items' => collect($classGroups)->flatMap(fn ($group) => $group['questions'])->values()->all(),
                    'comments' => $commentQuestions,
                    'item_count' => collect($classGroups)->sum(fn ($group) => count($group['questions'])),
                    'comment_count' => count($commentQuestions),
                    'notes' => $row->notes,
                    'is_active' => (bool) $row->is_active,
                ];
            })
            ->withQueryString();

        $questionnaireTypes = DB::table('questionnaire_type')
            ->select('id', 'code', 'name')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('name')
            ->get();

        $branches = DB::table('branch')
            ->select('id', 'code', 'name')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('name')
            ->get();

        $questionChoices = DB::table('question_choices')
            ->select('id', 'code', 'name', 'quantity')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('code')
            ->get();

        $questionClasses = DB::table('question_class')
            ->select('id', 'code', 'name')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('name')
            ->get();

        $questions = DB::table('question')
            ->leftJoin('question_type as qt', 'qt.id', '=', 'question.question_type_id')
            ->leftJoin('question_class as qc', 'qc.id', '=', 'question.question_class_id')
            ->select(
                'question.id',
                'question.code',
                'question.description',
                'question.question_class_id',
                'question.question_type_id',
                'qt.name as question_type_name',
                'qc.name as question_class_name'
            )
            ->where('question.is_deleted', 0)
            ->where('question.is_activated', 1)
            ->orderBy('question.code')
            ->get();

        return Inertia::render('Admin/Questionnaires', [
            'questionnaires' => $questionnaires,
            'questionnaireTypes' => $questionnaireTypes,
            'branches' => $branches,
            'questionChoices' => $questionChoices,
            'questionClasses' => $questionClasses,
            'questions' => $questions,
            'questionnaireTitleChecks' => DB::table('questionnaires')
                ->select('id', 'title')
                ->where('is_deleted', 0)
                ->get(),
            'filters' => ['search' => $search],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'questionnaire_title' => [
                'required',
                'string',
                'max:150',
                Rule::unique('questionnaires', 'title')->where(fn ($query) => $query->where('is_deleted', 0)),
            ],
            'questionnaire_type_id' => 'required|exists:questionnaire_type,id',
            'question_choices_id' => 'required|exists:question_choices,id',
            'branch_id' => 'required|integer|exists:branch,id',
            'class_groups' => 'array',
            'class_groups.*.question_class_id' => 'nullable|integer|exists:question_class,id',
            'class_groups.*.question_class_name' => 'nullable|string|max:150',
            'class_groups.*.weight' => 'nullable|integer|min:5|max:100',
            'class_groups.*.questions' => 'array',
            'class_groups.*.questions.*' => 'integer|exists:question,id',
            'comments' => 'array',
            'comments.*' => 'integer|exists:question,id',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $count = DB::table('questionnaires')
            ->pluck('code')
            ->map(function ($code) {
                preg_match('/^QUES-(\d+)$/', (string) $code, $matches);

                return (int) ($matches[1] ?? 0);
            })
            ->max() + 1;
        $questionClassNames = DB::table('question_class')
            ->whereIn('id', collect($validated['class_groups'] ?? [])->pluck('question_class_id')->filter()->all())
            ->pluck('name', 'id');
        $classGroups = collect($validated['class_groups'] ?? [])
            ->filter(fn ($group) => ! empty($group['question_class_id']) || ! empty($group['question_class_name']) || ! empty($group['weight']) || ! empty($group['questions']))
            ->map(fn ($group) => [
                'class_name' => $questionClassNames[(int) ($group['question_class_id'] ?? 0)] ?? ($group['question_class_name'] ?? ''),
                'weight_percentage' => (int) ($group['weight'] ?? 0),
                'questions' => array_values($group['questions'] ?? []),
            ])
            ->values()
            ->all();

        $itemsPayload = [
            'scale_questions' => $classGroups,
            'comment_section' => [
                'questions' => collect($validated['comments'] ?? [])
                    ->map(fn ($questionId) => ['question_id' => (int) $questionId])
                    ->values()
                    ->all(),
            ],
        ];

        DB::table('questionnaires')->insert([
            'code' => 'QUES-' . str_pad((string) $count, 3, '0', STR_PAD_LEFT),
            'title' => $validated['questionnaire_title'],
            'branch_id' => $validated['branch_id'],
            'questionnaire_type_id' => $validated['questionnaire_type_id'],
            'question_choices_id' => $validated['question_choices_id'],
            'items' => json_encode($itemsPayload),
            'comments' => json_encode(array_values($validated['comments'] ?? [])),
            'notes' => $validated['notes'] ?? null,
            'is_activated' => ! empty($validated['is_active']) ? 1 : 0,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back()->with('success', 'Questionnaire created.');
    }

    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'questionnaire_title' => [
                'required',
                'string',
                'max:150',
                Rule::unique('questionnaires', 'title')
                    ->ignore($id)
                    ->where(fn ($query) => $query->where('is_deleted', 0)),
            ],
            'questionnaire_type_id' => 'required|exists:questionnaire_type,id',
            'question_choices_id' => 'required|exists:question_choices,id',
            'branch_id' => 'required|integer|exists:branch,id',
            'class_groups' => 'array',
            'class_groups.*.question_class_id' => 'nullable|integer|exists:question_class,id',
            'class_groups.*.question_class_name' => 'nullable|string|max:150',
            'class_groups.*.weight' => 'nullable|integer|min:5|max:100',
            'class_groups.*.questions' => 'array',
            'class_groups.*.questions.*' => 'integer|exists:question,id',
            'comments' => 'array',
            'comments.*' => 'integer|exists:question,id',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $questionClassNames = DB::table('question_class')
            ->whereIn('id', collect($validated['class_groups'] ?? [])->pluck('question_class_id')->filter()->all())
            ->pluck('name', 'id');
        $classGroups = collect($validated['class_groups'] ?? [])
            ->filter(fn ($group) => ! empty($group['question_class_id']) || ! empty($group['question_class_name']) || ! empty($group['weight']) || ! empty($group['questions']))
            ->map(fn ($group) => [
                'class_name' => $questionClassNames[(int) ($group['question_class_id'] ?? 0)] ?? ($group['question_class_name'] ?? ''),
                'weight_percentage' => (int) ($group['weight'] ?? 0),
                'questions' => array_values($group['questions'] ?? []),
            ])
            ->values()
            ->all();

        $itemsPayload = [
            'scale_questions' => $classGroups,
            'comment_section' => [
                'questions' => collect($validated['comments'] ?? [])
                    ->map(fn ($questionId) => ['question_id' => (int) $questionId])
                    ->values()
                    ->all(),
            ],
        ];

        DB::table('questionnaires')->where('id', $id)->update([
            'title' => $validated['questionnaire_title'],
            'branch_id' => $validated['branch_id'],
            'questionnaire_type_id' => $validated['questionnaire_type_id'],
            'question_choices_id' => $validated['question_choices_id'],
            'items' => json_encode($itemsPayload),
            'comments' => json_encode(array_values($validated['comments'] ?? [])),
            'notes' => $validated['notes'] ?? null,
            'is_activated' => ! empty($validated['is_active']) ? 1 : 0,
            'updated_at' => now(),
        ]);

        return back()->with('success', 'Questionnaire updated.');
    }

    public function destroy(int $id)
    {
        DB::table('questionnaires')->where('id', $id)->update([
            'is_deleted' => 1,
            'updated_at' => now(),
        ]);

        return back()->with('success', 'Questionnaire deleted.');
    }
}
