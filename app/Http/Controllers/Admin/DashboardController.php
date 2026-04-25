<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Program;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $branchId = $this->scopedBranchId();

        $stats = [
            ['label' => 'Students', 'value' => Student::when($branchId, fn ($q) => $q->where('branch_id', $branchId))->count(), 'icon' => 'students'],
            ['label' => 'Teachers', 'value' => Teacher::when($branchId, fn ($q) => $q->where('branch_id', $branchId))->count(), 'icon' => 'teachers'],
            ['label' => 'Employees', 'value' => Employee::when($branchId, fn ($q) => $q->where('branch_id', $branchId))->count(), 'icon' => 'briefcase'],
            ['label' => 'Programs', 'value' => Program::count(), 'icon' => 'programs'],
        ];

        if (! $branchId) {
            array_push($stats,
                ['label' => 'Branches', 'value' => Branch::count(), 'icon' => 'branches'],
                ['label' => 'Departments', 'value' => Department::count(), 'icon' => 'departments']
            );
        }

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
            'branchSummaries' => $this->branchSummaries($branchId),
            'departmentStatuses' => $this->departmentStatuses($branchId),
        ]);
    }

    private function branchSummaries(?int $branchId): array
    {
        return DB::table('branch as b')
            ->select('b.id', 'b.code', 'b.name')
            ->where('b.is_deleted', 0)
            ->where('b.is_activated', 1)
            ->when($branchId, fn ($query) => $query->where('b.id', $branchId))
            ->orderByRaw("CASE WHEN UPPER(b.code) = 'OVERALL' OR LOWER(b.name) LIKE '%overall%' THEN 0 ELSE 1 END")
            ->orderBy('b.name')
            ->get()
            ->map(function ($branch) {
                $departmentIds = DB::table('department')
                    ->where('branch_id', $branch->id)
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->pluck('id');

                return [
                    'id' => $branch->id,
                    'code' => $branch->code,
                    'name' => $branch->name,
                    'departments_count' => $departmentIds->count(),
                    'programs_count' => DB::table('program')
                        ->whereIn('department_id', $departmentIds)
                        ->where('is_deleted', 0)
                        ->where('is_activated', 1)
                        ->count(),
                    'strands_count' => DB::table('strand')
                        ->whereIn('department_id', $departmentIds)
                        ->where('is_deleted', 0)
                        ->where('is_activated', 1)
                        ->count(),
                ];
            })
            ->values()
            ->all();
    }

    private function departmentStatuses(?int $branchId): array
    {
        $departments = DB::table('department as d')
            ->leftJoin('branch as b', 'b.id', '=', 'd.branch_id')
            ->select('d.id', 'd.code', 'd.name', 'd.branch_id', 'b.name as branch_name')
            ->where('d.is_deleted', 0)
            ->where('d.is_activated', 1)
            ->when($branchId, fn ($query) => $query->where('d.branch_id', $branchId))
            ->orderBy('b.name')
            ->orderBy('d.name')
            ->get();

        $selectedSubject = $this->selectedScopes('QTYPE-SUBJECT');
        $selectedPeer = $this->selectedScopes('QTYPE-PEER');
        $selectedHead = $this->selectedScopes('QTYPE-HEAD');
        $selectedEmployee = $this->selectedScopes('QTYPE-EMPLOYEE');
        $employeeScope = $this->employeeFeedbackScope($branchId);

        return $departments
            ->map(function ($department) use ($selectedSubject, $selectedPeer, $selectedHead, $selectedEmployee, $employeeScope) {
                $kind = $this->departmentKind($department);
                $scope = $this->departmentScope($department, $kind);
                $subjectProgress = $this->progressFromIds(
                    $scope['ids'],
                    $selectedSubject[$scope['selected_key']] ?? [],
                    'Subject Teacher',
                    $scope['label'],
                    'admin.subject-assignments',
                );
                $peerProgress = $this->peerProgress($department, $scope, $selectedPeer);
                $headProgress = $this->headProgress($department, $selectedHead);
                $employeeProgress = $this->progressFromIds(
                    $employeeScope['ids'],
                    $selectedEmployee['employee_department_ids'] ?? [],
                    'Employee Feedback',
                    'employee departments',
                    'admin.employee-assignments',
                );
                $flows = [$subjectProgress, $peerProgress, $headProgress, $employeeProgress];
                $total = collect($flows)->sum('total');
                $loaded = collect($flows)->sum('loaded');
                $percent = $total > 0 ? (int) round(($loaded / $total) * 100) : 0;
                $isComplete = $total > 0 && $loaded === $total;

                return [
                    'id' => $department->id,
                    'name' => $department->name,
                    'code' => $department->code,
                    'branch_id' => $department->branch_id,
                    'branch' => $department->branch_name ?? '-',
                    'scope_label' => 'evaluation items',
                    'total' => $total,
                    'loaded' => $loaded,
                    'percent' => $percent,
                    'status' => $isComplete ? 'Complete' : ($loaded > 0 ? 'In Progress' : 'Not Started'),
                    'is_complete' => $isComplete,
                    'flows' => $flows,
                ];
            })
            ->values()
            ->all();
    }

    private function selectedScopes(string $typeCode): array
    {
        $selected = [
            'program_ids' => [],
            'strand_ids' => [],
            'year_level_ids' => [],
            'department_ids' => [],
            'teacher_ids' => [],
            'employee_department_ids' => [],
            'peer_custom_groups' => [],
        ];

        DB::table('questionnaire_distribution as qd')
            ->join('questionnaires as q', 'q.id', '=', 'qd.questionnaire_id')
            ->join('questionnaire_type as qt', 'qt.id', '=', 'q.questionnaire_type_id')
            ->select('qd.items')
            ->where('qd.is_deleted', 0)
            ->where('q.is_deleted', 0)
            ->where('qt.code', $typeCode)
            ->get()
            ->each(function ($distribution) use (&$selected) {
                $items = json_decode($distribution->items ?? '{}', true) ?: [];

                foreach (['program_ids', 'strand_ids', 'year_level_ids'] as $key) {
                    $selected[$key] = array_values(array_unique(array_merge(
                        $selected[$key],
                        array_map('intval', $items[$key] ?? []),
                    )));
                }

                foreach (['department_id' => 'department_ids', 'teacher_id' => 'teacher_ids', 'employee_department_id' => 'employee_department_ids'] as $itemKey => $selectedKey) {
                    if (!empty($items[$itemKey])) {
                        $selected[$selectedKey][] = (int) $items[$itemKey];
                        $selected[$selectedKey] = array_values(array_unique($selected[$selectedKey]));
                    }
                }

                if (!empty($items['department_id']) && !empty($items['custom_scope_groups'])) {
                    $selected['peer_custom_groups'][(int) $items['department_id']] = collect($items['custom_scope_groups'])
                        ->filter(fn ($group) => !empty($group['questionnaire_id']))
                        ->flatMap(fn ($group) => $group['subject_ids'] ?? [])
                        ->map(fn ($id) => (int) $id)
                        ->unique()
                        ->values()
                        ->all();
                }
            });

        return $selected;
    }

    private function progressFromIds(array $scopeIds, array $selectedIds, string $label, string $scopeLabel, string $routeName): array
    {
        $total = count($scopeIds);
        $loaded = collect($scopeIds)
            ->filter(fn ($id) => in_array((int) $id, array_map('intval', $selectedIds), true))
            ->count();

        return $this->progressPayload($label, $scopeLabel, $loaded, $total, $routeName);
    }

    private function peerProgress(object $department, array $scope, array $selectedPeer): array
    {
        if (in_array((int) $department->id, $selectedPeer['department_ids'] ?? [], true)) {
            $customIds = $selectedPeer['peer_custom_groups'][(int) $department->id] ?? [];

            if (!empty($customIds)) {
                return $this->progressFromIds($scope['ids'], $customIds, 'Peer to Peer', $scope['label'], 'admin.peer-assignments');
            }

            return $this->progressPayload('Peer to Peer', $scope['label'], count($scope['ids']), count($scope['ids']), 'admin.peer-assignments');
        }

        return $this->progressFromIds($scope['ids'], $selectedPeer[$scope['selected_key']] ?? [], 'Peer to Peer', $scope['label'], 'admin.peer-assignments');
    }

    private function headProgress(object $department, array $selectedHead): array
    {
        $teacherIds = DB::table('teacher')
            ->where('department_id', $department->id)
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->whereRaw('LOWER(role) LIKE ?', ['%program chair%'])
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return $this->progressFromIds($teacherIds, $selectedHead['teacher_ids'] ?? [], 'School Heads', 'program chairs', 'admin.head-assignments');
    }

    private function employeeFeedbackScope(?int $branchId): array
    {
        $ids = DB::table('employee_department')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($branchId, fn ($query) => $query->where(function ($sub) use ($branchId) {
                $sub->where('branch_id', $branchId)
                    ->orWhereNull('branch_id');
            }))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return ['ids' => $ids];
    }

    private function progressPayload(string $label, string $scopeLabel, int $loaded, int $total, string $routeName): array
    {
        $percent = $total > 0 ? (int) round(($loaded / $total) * 100) : 0;
        $isComplete = $total > 0 && $loaded === $total;

        return [
            'label' => $label,
            'scope_label' => $scopeLabel,
            'loaded' => $loaded,
            'total' => $total,
            'percent' => $percent,
            'status' => $isComplete ? 'Complete' : ($loaded > 0 ? 'In Progress' : 'Not Started'),
            'is_complete' => $isComplete,
            'route_name' => $routeName,
        ];
    }

    private function departmentScope(object $department, string $kind): array
    {
        if ($kind === 'college') {
            return [
                'label' => 'programs',
                'selected_key' => 'program_ids',
                'ids' => DB::table('program')
                    ->where('department_id', $department->id)
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->all(),
            ];
        }

        if ($kind === 'senior-high') {
            return [
                'label' => 'strands',
                'selected_key' => 'strand_ids',
                'ids' => DB::table('strand')
                    ->where('department_id', $department->id)
                    ->where('is_deleted', 0)
                    ->where('is_activated', 1)
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->all(),
            ];
        }

        return [
            'label' => 'grade levels',
            'selected_key' => 'year_level_ids',
            'ids' => DB::table('education_level')
                ->selectRaw('MIN(id) as id')
                ->where('department_id', $department->id)
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->groupBy('year_level')
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all(),
        ];
    }

    private function departmentKind(object $department): string
    {
        $name = strtolower((string) ($department->name ?? ''));
        $code = strtolower((string) ($department->code ?? ''));

        if (str_contains($name, 'college') || str_contains($code, 'col')) {
            return 'college';
        }

        if (str_contains($name, 'senior high') || str_contains($code, 'shs')) {
            return 'senior-high';
        }

        return 'grade-level';
    }
}
