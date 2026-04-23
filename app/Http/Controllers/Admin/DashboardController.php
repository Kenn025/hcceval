<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Program;
use App\Models\Student;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $branchId = $this->scopedBranchId();

        $stats = [
            ['label' => 'Students', 'value' => Student::when($branchId, fn ($q) => $q->where('branch_id', $branchId))->count(), 'icon' => 'students'],
            ['label' => 'Teachers', 'value' => Employee::when($branchId, fn ($q) => $q->where('branch_id', $branchId))->count(), 'icon' => 'teachers'],
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
        ]);
    }
}
