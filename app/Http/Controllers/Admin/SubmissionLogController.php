<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class SubmissionLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $type = trim((string) $request->input('type', ''));
        $allowedTypes = ['subject', 'peer', 'head', 'employee'];
        $type = in_array($type, $allowedTypes, true) ? $type : '';
        $perPage = $request->integer('per_page', 20);
        $perPage = in_array($perPage, [10, 15, 20, 25, 50, 100], true) ? $perPage : 20;

        if (! Schema::hasTable('evaluation_submissions')) {
            return Inertia::render('Admin/SubmissionLogs', [
                'logs' => [
                    'data' => [],
                    'total' => 0,
                    'per_page' => $perPage,
                    'current_page' => 1,
                    'last_page' => 1,
                    'from' => null,
                    'to' => null,
                ],
                'filters' => compact('search', 'type') + ['per_page' => $perPage],
                'stats' => ['total' => 0, 'today' => 0, 'average' => null],
                'tableMissing' => true,
            ]);
        }

        $baseQuery = $this->baseQuery()
            ->when($this->scopedBranchId(), function ($query, int $branchId) {
                $query->where(function ($scope) use ($branchId) {
                    $scope->where('es.branch_id', $branchId)
                        ->orWhere('t.branch_id', $branchId)
                        ->orWhere('e.branch_id', $branchId)
                        ->orWhere('sd.branch_id', $branchId);
                });
            })
            ->when($type, fn ($query) => $query->where('qt.code', $this->typeCode($type)))
            ->when($search, function ($query) use ($search) {
                $query->where(function ($sub) use ($search) {
                    $sub->where('qt.name', 'like', "%{$search}%")
                        ->orWhere('qt.code', 'like', "%{$search}%")
                        ->orWhere('q.title', 'like', "%{$search}%")
                        ->orWhere('b.name', 'like', "%{$search}%")
                        ->orWhere('s.name', 'like', "%{$search}%")
                        ->orWhere('s.code', 'like', "%{$search}%")
                        ->orWhereRaw("CONCAT(COALESCE(t.firstname, ''), ' ', COALESCE(t.lastname, '')) like ?", ["%{$search}%"])
                        ->orWhereRaw("CONCAT(COALESCE(e.firstname, ''), ' ', COALESCE(e.lastname, '')) like ?", ["%{$search}%"]);
                });
            });

        $logs = (clone $baseQuery)
            ->orderByDesc(DB::raw('COALESCE(es.submitted_at, es.created_at)'))
            ->orderByDesc('es.id')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn ($row) => $this->formatRow($row));

        $statsQuery = clone $baseQuery;
        $stats = [
            'total' => (clone $statsQuery)->count(),
            'today' => (clone $statsQuery)->whereDate(DB::raw('COALESCE(es.submitted_at, es.created_at)'), today())->count(),
            'average' => round((float) ((clone $statsQuery)->avg('es.overall_average') ?? 0), 2),
        ];

        return Inertia::render('Admin/SubmissionLogs', [
            'logs' => $logs,
            'filters' => [
                'search' => $search,
                'type' => $type,
                'per_page' => $perPage,
            ],
            'stats' => $stats,
            'tableMissing' => false,
        ]);
    }

    private function baseQuery()
    {
        return DB::table('evaluation_submissions as es')
            ->leftJoin('branch as b', 'b.id', '=', 'es.branch_id')
            ->leftJoin('academic_year as ay', 'ay.id', '=', 'es.academic_year_id')
            ->leftJoin('questionnaire_type as qt', 'qt.id', '=', 'es.questionnaire_type_id')
            ->leftJoin('questionnaires as q', 'q.id', '=', 'es.questionnaire_id')
            ->leftJoin('subject as s', 's.id', '=', 'es.subject_id')
            ->leftJoin('department as sd', 'sd.id', '=', 's.department_id')
            ->leftJoin('teacher as t', 't.id', '=', 'es.teacher_id')
            ->leftJoin('employee as e', 'e.id', '=', 'es.employee_id')
            ->select([
                'es.id',
                'es.branch_id',
                'es.academic_year_id',
                'es.questionnaire_type_id',
                'es.questionnaire_id',
                'es.subject_id',
                'es.teacher_id',
                'es.employee_id',
                'es.answers',
                'es.comments',
                'es.overall_average',
                'es.submitted_at',
                'es.created_at',
                'b.name as branch_name',
                'ay.from_year',
                'ay.to_year',
                'ay.term',
                'qt.code as type_code',
                'qt.name as type_name',
                'q.title as questionnaire_title',
                's.code as subject_code',
                's.name as subject_name',
                DB::raw("TRIM(CONCAT(COALESCE(t.firstname, ''), ' ', COALESCE(t.lastname, ''))) as teacher_name"),
                DB::raw("TRIM(CONCAT(COALESCE(e.firstname, ''), ' ', COALESCE(e.lastname, ''))) as employee_name"),
            ]);
    }

    private function formatRow(object $row): array
    {
        $answers = json_decode($row->answers ?? '[]', true);
        $answers = is_array($answers) ? $answers : [];
        $comments = json_decode($row->comments ?? '[]', true);
        $commentText = is_array($comments)
            ? (string) ($comments['text'] ?? '')
            : (string) ($row->comments ?? '');

        return [
            'id' => (int) $row->id,
            'submitted_at' => $row->submitted_at ?? $row->created_at,
            'branch' => $row->branch_name ?? 'Unassigned',
            'academic_year' => $row->from_year && $row->to_year
                ? "{$row->from_year}-{$row->to_year}"
                : '-',
            'term' => $row->term ?? '-',
            'type' => $this->typeLabel($row->type_code, $row->type_name),
            'type_code' => $row->type_code,
            'questionnaire' => $row->questionnaire_title ?? '-',
            'target' => $this->targetLabel($row),
            'overall_average' => $row->overall_average !== null ? number_format((float) $row->overall_average, 2) : '-',
            'answer_count' => count($answers),
            'comments' => $commentText,
            'answers' => array_values($answers),
        ];
    }

    private function targetLabel(object $row): string
    {
        if ($row->employee_id) {
            return $row->employee_name ?: "Employee #{$row->employee_id}";
        }

        if ($row->subject_id) {
            $subject = trim(implode(' - ', array_filter([$row->subject_code, $row->subject_name])));
            $teacher = $row->teacher_name ? " ({$row->teacher_name})" : '';

            return ($subject ?: "Subject #{$row->subject_id}") . $teacher;
        }

        if ($row->teacher_id) {
            return $row->teacher_name ?: "Teacher #{$row->teacher_id}";
        }

        return 'Evaluation target';
    }

    private function typeCode(string $type): string
    {
        return match ($type) {
            'peer' => 'QTYPE-PEER',
            'head' => 'QTYPE-HEAD',
            'employee' => 'QTYPE-EMPLOYEE',
            default => 'QTYPE-SUBJECT',
        };
    }

    private function typeLabel(?string $code, ?string $name): string
    {
        return match ($code) {
            'QTYPE-SUBJECT' => 'Subject Evaluation',
            'QTYPE-PEER' => 'Peer Evaluation',
            'QTYPE-HEAD' => 'School Heads Evaluation',
            'QTYPE-EMPLOYEE' => 'Employee Evaluation',
            default => $name ?: 'Evaluation',
        };
    }
}
