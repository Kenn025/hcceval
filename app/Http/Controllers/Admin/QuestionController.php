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
            ->select('id as question_id', 'code', 'description as question_text', 'question_type_id', 'is_required', 'is_activated as is_active', 'is_deleted')
            ->where('is_deleted', 0)
            ->when($search, fn ($q) => $q->where('description', 'like', "%{$search}%"))
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString();
    }

    public function subjectQuestions(Request $request)
    {
        $search = $request->input('search', '');
        return Inertia::render('Admin/Questions', [
            'questions'    => $this->getQuestions($search),
            'questionType' => 'subject',
            'filters'      => ['search' => $search],
        ]);
    }

    public function peerQuestions(Request $request)
    {
        $search = $request->input('search', '');
        return Inertia::render('Admin/Questions', [
            'questions'    => $this->getQuestions($search),
            'questionType' => 'peer',
            'filters'      => ['search' => $search],
        ]);
    }

    public function employeeQuestions(Request $request)
    {
        $search = $request->input('search', '');
        return Inertia::render('Admin/Questions', [
            'questions'    => $this->getQuestions($search),
            'questionType' => 'employee',
            'filters'      => ['search' => $search],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'question_text' => 'required|string|max:1000',
            'is_active'     => 'boolean',
        ]);

        $count = DB::table('question')->count() + 1;

        DB::table('question')->insert([
            'code'             => 'Q-' . str_pad($count, 3, '0', STR_PAD_LEFT),
            'description'      => $validated['question_text'],
            'question_type_id' => 1,
            'is_required'      => 1,
            'is_activated'     => $validated['is_active'] ? 1 : 0,
            'is_deleted'       => 0,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        return back()->with('success', 'Question created.');
    }

    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'question_text' => 'required|string|max:1000',
            'is_active'     => 'boolean',
        ]);

        DB::table('question')->where('id', $id)->update([
            'description'  => $validated['question_text'],
            'is_activated' => $validated['is_active'] ? 1 : 0,
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
