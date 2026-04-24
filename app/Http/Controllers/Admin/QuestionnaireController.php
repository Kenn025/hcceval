<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class QuestionnaireController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search', '');

        $questionnaires = DB::table('questionnaires as q')
            ->leftJoin('questionnaire_type as qt', 'qt.id', '=', 'q.questionnaire_type_id')
            ->leftJoin('question_choices as qc', 'qc.id', '=', 'q.question_choices_id')
            ->select(
                'q.id as questionnaire_id',
                'q.code as questionnaire_code',
                'q.questionnaire_type_id',
                'q.question_choices_id',
                'qt.name as questionnaire_type_name',
                'qc.code as question_choices_code',
                'qc.quantity as question_choices_quantity',
                'q.items',
                'q.comments',
                'q.is_activated as is_active',
                'q.is_deleted'
            )
            ->where('q.is_deleted', 0)
            ->when($search, fn ($query) => $query->where(function ($sub) use ($search) {
                $sub->where('q.code', 'like', "%{$search}%")
                    ->orWhere('qt.name', 'like', "%{$search}%")
                    ->orWhere('qc.code', 'like', "%{$search}%");
            }))
            ->orderBy('q.code')
            ->paginate(15)
            ->through(function ($row) {
                $items = json_decode($row->items ?? '[]', true) ?: [];
                $comments = json_decode($row->comments ?? '[]', true) ?: [];

                return [
                    'questionnaire_id' => $row->questionnaire_id,
                    'questionnaire_code' => $row->questionnaire_code,
                    'questionnaire_type_id' => $row->questionnaire_type_id,
                    'question_choices_id' => $row->question_choices_id,
                    'questionnaire_type_name' => $row->questionnaire_type_name,
                    'question_choices_code' => $row->question_choices_code,
                    'question_choices_quantity' => $row->question_choices_quantity,
                    'items' => $items,
                    'comments' => $comments,
                    'item_count' => count($items),
                    'comment_count' => count($comments),
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

        $questionChoices = DB::table('question_choices')
            ->select('id', 'code', 'quantity')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderBy('code')
            ->get();

        $questions = DB::table('question')
            ->leftJoin('question_type as qt', 'qt.id', '=', 'question.question_type_id')
            ->select(
                'question.id',
                'question.code',
                'question.description',
                'question.question_type_id',
                'qt.name as question_type_name'
            )
            ->where('question.is_deleted', 0)
            ->where('question.is_activated', 1)
            ->orderBy('question.code')
            ->get();

        return Inertia::render('Admin/Questionnaires', [
            'questionnaires' => $questionnaires,
            'questionnaireTypes' => $questionnaireTypes,
            'questionChoices' => $questionChoices,
            'questions' => $questions,
            'filters' => ['search' => $search],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'questionnaire_code' => 'required|string|max:50|unique:questionnaires,code',
            'questionnaire_type_id' => 'required|exists:questionnaire_type,id',
            'question_choices_id' => 'required|exists:question_choices,id',
            'items' => 'array',
            'items.*' => 'integer|exists:question,id',
            'comments' => 'array',
            'comments.*' => 'integer|exists:question,id',
            'is_active' => 'boolean',
        ]);

        DB::table('questionnaires')->insert([
            'code' => $validated['questionnaire_code'],
            'questionnaire_type_id' => $validated['questionnaire_type_id'],
            'question_choices_id' => $validated['question_choices_id'],
            'items' => json_encode(array_values($validated['items'] ?? [])),
            'comments' => json_encode(array_values($validated['comments'] ?? [])),
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
            'questionnaire_code' => "required|string|max:50|unique:questionnaires,code,{$id}",
            'questionnaire_type_id' => 'required|exists:questionnaire_type,id',
            'question_choices_id' => 'required|exists:question_choices,id',
            'items' => 'array',
            'items.*' => 'integer|exists:question,id',
            'comments' => 'array',
            'comments.*' => 'integer|exists:question,id',
            'is_active' => 'boolean',
        ]);

        DB::table('questionnaires')->where('id', $id)->update([
            'code' => $validated['questionnaire_code'],
            'questionnaire_type_id' => $validated['questionnaire_type_id'],
            'question_choices_id' => $validated['question_choices_id'],
            'items' => json_encode(array_values($validated['items'] ?? [])),
            'comments' => json_encode(array_values($validated['comments'] ?? [])),
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
