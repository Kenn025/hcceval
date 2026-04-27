<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class EvaluationCommentReviewController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'rating_type' => 'required|in:subject,peer',
            'teacher_id' => 'nullable|integer',
            'subject_id' => 'nullable|integer',
            'branch_id' => 'nullable|integer',
            'department_id' => 'nullable|integer',
            'program_id' => 'nullable|integer',
            'strand_id' => 'nullable|integer',
            'school_year' => 'nullable|string|max:20',
            'department_group' => 'nullable|string|max:150',
            'program_group' => 'nullable|string|max:150',
            'strand_group' => 'nullable|string|max:150',
        ]);

        $comments = $this->commentRows($request);
        $scope = $comments->first();

        return Inertia::render('Admin/EvaluationCommentsReview', [
            'comments' => $comments->values(),
            'filters' => $filters,
            'scope' => [
                'rating_type' => $filters['rating_type'],
                'teacher_name' => $scope->teacher_name ?? null,
                'subject_name' => $scope->subject_name ?? null,
                'department_name' => $scope->department_name ?? $filters['department_group'] ?? null,
                'program_name' => $scope->program_name ?? $filters['program_group'] ?? null,
                'strand_name' => $scope->strand_name ?? $filters['strand_group'] ?? null,
                'school_year' => $filters['school_year'] ?? null,
            ],
            'stats' => [
                'total' => $comments->count(),
                'reviewed' => $comments->where('is_reviewed', true)->count(),
                'hidden' => $comments->where('is_hidden', true)->count(),
            ],
        ]);
    }

    public function markReviewed(Request $request, int $submissionId): RedirectResponse
    {
        $this->upsertReview($submissionId, [
            'is_reviewed' => true,
            'reviewed_by_admin_id' => session('admin_id'),
            'reviewed_at' => now(),
        ]);

        AuditLogger::record('comment.reviewed', 'evaluation_submission', $submissionId, [], $request);

        return back()->with('success', 'Comment marked as reviewed.');
    }

    public function markProgramReviewed(Request $request): RedirectResponse
    {
        $request->validate([
            'rating_type' => 'required|in:subject,peer',
            'teacher_id' => 'nullable|integer',
            'subject_id' => 'nullable|integer',
            'branch_id' => 'nullable|integer',
            'department_id' => 'nullable|integer',
            'program_id' => 'nullable|integer',
            'strand_id' => 'nullable|integer',
            'school_year' => 'nullable|string|max:20',
            'department_group' => 'nullable|string|max:150',
            'program_group' => 'nullable|string|max:150',
            'strand_group' => 'nullable|string|max:150',
        ]);

        $comments = $this->commentRows($request);

        if ($comments->isEmpty()) {
            return back()->with('error', 'No comments were found in this program scope.');
        }

        $comments->each(fn (object $comment) => $this->upsertReview((int) $comment->id, [
            'is_reviewed' => true,
            'reviewed_by_admin_id' => session('admin_id'),
            'reviewed_at' => now(),
        ]));

        AuditLogger::record('comment.program_reviewed', 'program', $request->integer('program_id') ?: null, [
            'rating_type' => $request->input('rating_type'),
            'reviewed_count' => $comments->count(),
            'teacher_id' => $request->input('teacher_id'),
            'subject_id' => $request->input('subject_id'),
            'department_id' => $request->input('department_id'),
            'program_id' => $request->input('program_id'),
            'strand_id' => $request->input('strand_id'),
            'department_group' => $request->input('department_group'),
            'program_group' => $request->input('program_group'),
            'strand_group' => $request->input('strand_group'),
            'school_year' => $request->input('school_year'),
        ], $request);

        return back()->with('success', "Program comments marked reviewed ({$comments->count()} comment(s)).");
    }

    public function toggleHidden(Request $request, int $submissionId): RedirectResponse
    {
        $review = Schema::hasTable('evaluation_comment_reviews')
            ? DB::table('evaluation_comment_reviews')->where('evaluation_submission_id', $submissionId)->first()
            : null;
        $hide = ! (bool) ($review->is_hidden ?? false);

        $this->upsertReview($submissionId, [
            'is_hidden' => $hide,
            'hidden_by_admin_id' => $hide ? session('admin_id') : null,
            'hidden_at' => $hide ? now() : null,
        ]);

        AuditLogger::record($hide ? 'comment.hidden' : 'comment.shown', 'evaluation_submission', $submissionId, [], $request);

        return back()->with('success', $hide ? 'Comment hidden from teacher ratings.' : 'Comment restored.');
    }

    private function commentRows(Request $request): Collection
    {
        if (! Schema::hasTable('evaluation_submissions')) {
            return collect();
        }

        $ratingType = $request->input('rating_type', 'subject');
        $typeCode = $ratingType === 'peer' ? 'QTYPE-PEER' : 'QTYPE-SUBJECT';
        $questionnaireTypeId = DB::table('questionnaire_type')->where('code', $typeCode)->value('id');

        $query = DB::table('evaluation_submissions as es')
            ->leftJoin('teacher as t', 't.id', '=', 'es.teacher_id')
            ->leftJoin('subject as s', 's.id', '=', 'es.subject_id')
            ->leftJoin('department as d', 'd.id', '=', 't.department_id')
            ->leftJoin('program as p', 'p.id', '=', 't.program_id')
            ->leftJoin('strand as st', 'st.id', '=', 't.strand_id')
            ->leftJoin('academic_year as ay', 'ay.id', '=', 'es.academic_year_id')
            ->leftJoin('evaluation_comment_reviews as ecr', 'ecr.evaluation_submission_id', '=', 'es.id')
            ->select(
                'es.id',
                'es.comments',
                'es.submitted_at',
                'es.created_at',
                'es.teacher_id',
                'es.subject_id',
                DB::raw("TRIM(CONCAT(COALESCE(t.firstname, ''), ' ', COALESCE(t.middlename, ''), ' ', COALESCE(t.lastname, ''))) as teacher_name"),
                's.name as subject_name',
                's.code as subject_code',
                'd.name as department_name',
                'p.name as program_name',
                'st.name as strand_name',
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year"),
                'ay.term as semester',
                DB::raw('COALESCE(ecr.is_reviewed, 0) as is_reviewed'),
                DB::raw('COALESCE(ecr.is_hidden, 0) as is_hidden'),
                'ecr.reviewed_at',
                'ecr.hidden_at'
            )
            ->whereNotNull('es.comments')
            ->when($questionnaireTypeId, fn ($builder) => $builder->where('es.questionnaire_type_id', $questionnaireTypeId))
            ->when($ratingType === 'subject', fn ($builder) => $builder->whereNotNull('es.subject_id'))
            ->when($ratingType === 'peer', fn ($builder) => $builder->whereNull('es.subject_id'))
            ->when($request->integer('teacher_id'), fn ($builder, $id) => $builder->where('es.teacher_id', $id))
            ->when($request->integer('subject_id'), fn ($builder, $id) => $builder->where('es.subject_id', $id))
            ->when($request->integer('branch_id'), fn ($builder, $id) => $builder->where('t.branch_id', $id))
            ->when($request->integer('department_id'), fn ($builder, $id) => $builder->where('t.department_id', $id))
            ->when($request->integer('program_id'), fn ($builder, $id) => $builder->where('t.program_id', $id))
            ->when($request->integer('strand_id'), fn ($builder, $id) => $builder->where('t.strand_id', $id))
            ->when($request->input('department_group'), fn ($builder, $name) => $builder->whereRaw('LOWER(TRIM(COALESCE(d.name, ""))) = ?', [strtolower(trim($name))]))
            ->when($request->input('program_group'), fn ($builder, $name) => $builder->whereRaw('LOWER(TRIM(COALESCE(p.name, ""))) = ?', [strtolower(trim($name))]))
            ->when($request->input('strand_group'), fn ($builder, $name) => $builder->whereRaw('LOWER(TRIM(COALESCE(st.name, ""))) = ?', [strtolower(trim($name))]))
            ->when($request->input('school_year'), fn ($builder, $year) => $builder->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$year]))
            ->orderByDesc(DB::raw('COALESCE(es.submitted_at, es.created_at)'));

        return $query->get()
            ->map(function (object $row) {
                $row->comment_text = $this->commentText($row->comments);
                $row->is_reviewed = (bool) $row->is_reviewed;
                $row->is_hidden = (bool) $row->is_hidden;

                return $row;
            })
            ->filter(fn (object $row) => trim((string) $row->comment_text) !== '')
            ->values();
    }

    private function upsertReview(int $submissionId, array $updates): void
    {
        if (! Schema::hasTable('evaluation_comment_reviews')) {
            return;
        }

        DB::table('evaluation_comment_reviews')->updateOrInsert(
            ['evaluation_submission_id' => $submissionId],
            array_merge([
                'updated_at' => now(),
                'created_at' => now(),
            ], $updates)
        );
    }

    private function commentText(?string $comments): string
    {
        $decoded = json_decode((string) $comments, true);

        if (is_array($decoded)) {
            return trim((string) ($decoded['text'] ?? collect($decoded)->filter(fn ($value) => is_scalar($value))->implode(' ')));
        }

        return trim((string) $comments);
    }
}
