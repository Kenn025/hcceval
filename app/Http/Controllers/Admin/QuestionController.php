<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class QuestionController extends Controller
{
    private function getQuestions(string $search = '')
    {
        return DB::table('question')
            ->leftJoin('question_type as qt', 'qt.id', '=', 'question.question_type_id')
            ->select(
                'question.id as question_id',
                'question.code as question_code',
                'question.description as question_text',
                'question.question_type_id',
                'qt.name as question_type_name',
                'question.is_required',
                'question.is_activated as is_active',
                'question.is_deleted'
            )
            ->where('question.is_deleted', 0)
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('question.description', 'like', "%{$search}%")
                    ->orWhere('question.code', 'like', "%{$search}%")
                    ->orWhere('qt.name', 'like', "%{$search}%");
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

    private function renderQuestionPage(Request $request, string $routeName, string $title, string $description)
    {
        $search = $request->input('search', '');

        return Inertia::render('Admin/Questions', [
            'questions' => $this->getQuestions($search),
            'questionTypes' => $this->getQuestionTypes(),
            'filters' => ['search' => $search],
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
            'question_code' => 'required|string|max:50|unique:question,code',
            'question_type_id' => 'required|exists:question_type,id',
            'question_text' => 'required|string|max:1000',
            'is_active'     => 'boolean',
        ]);

        DB::table('question')->insert([
            'code'             => $validated['question_code'],
            'description'      => $validated['question_text'],
            'question_type_id' => $validated['question_type_id'],
            'is_required'      => 1,
            'is_activated'     => ! empty($validated['is_active']) ? 1 : 0,
            'is_deleted'       => 0,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        return back()->with('success', 'Question created.');
    }

    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'question_code' => "required|string|max:50|unique:question,code,{$id}",
            'question_type_id' => 'required|exists:question_type,id',
            'question_text' => 'required|string|max:1000',
            'is_active'     => 'boolean',
        ]);

        DB::table('question')->where('id', $id)->update([
            'code' => $validated['question_code'],
            'description'  => $validated['question_text'],
            'question_type_id' => $validated['question_type_id'],
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
}
