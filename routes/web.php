<?php

use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\AssignmentController;
use App\Http\Controllers\Admin\BulkImportController;
use App\Http\Controllers\Admin\GlobalSearchController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\EmployeeController;
use App\Http\Controllers\Admin\EvaluationCycleController;
use App\Http\Controllers\Admin\OutstandingAwardsController;
use App\Http\Controllers\Admin\ProgramController;
use App\Http\Controllers\Admin\QuestionController;
use App\Http\Controllers\Admin\QuestionnaireController;
use App\Http\Controllers\Admin\RatingsController;
use App\Http\Controllers\Admin\StrandController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Admin\SubjectController;
use App\Http\Controllers\Admin\TeacherController;
use App\Http\Controllers\Admin\YearLevelController;
use App\Http\Controllers\Client\ClientLoginController;
use App\Http\Controllers\Client\ClientPasswordResetController;
use App\Http\Controllers\Client\EmployeePortalController;
use App\Http\Controllers\Client\StudentPortalController;
use App\Http\Controllers\Client\TeacherPortalController;
use App\Http\Controllers\BugReportController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Home');
});

Route::middleware('auth')->group(function () {
    Route::redirect('/admin', '/dashboard');

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // College Programs
    Route::get('/admin/college/programs', [ProgramController::class, 'index'])->name('admin.college.programs');
    Route::post('/admin/college/programs', [ProgramController::class, 'store']);
    Route::put('/admin/college/programs/{program}', [ProgramController::class, 'update']);
    Route::delete('/admin/college/programs/{program}', [ProgramController::class, 'destroy']);

    // Subjects (college / SHS / JHS / grade-school)
    Route::get('/admin/college/subjects', [SubjectController::class, 'index'])
        ->defaults('educationType', 'college')->name('admin.college.subjects');
    Route::get('/admin/senior-high/subjects', [SubjectController::class, 'index'])
        ->defaults('educationType', 'senior-high')->name('admin.senior-high.subjects');
    Route::get('/admin/junior-high/subjects', [SubjectController::class, 'index'])
        ->defaults('educationType', 'junior-high')->name('admin.junior-high.subjects');
    Route::get('/admin/grade-school/subjects', [SubjectController::class, 'index'])
        ->defaults('educationType', 'grade-school')->name('admin.grade-school.subjects');
    Route::post('/admin/subjects', [SubjectController::class, 'store']);
    Route::put('/admin/subjects/{subject}', [SubjectController::class, 'update']);
    Route::delete('/admin/subjects/{subject}', [SubjectController::class, 'destroy']);

    // Year Levels / Grade Levels
    Route::get('/admin/college/year-levels', [YearLevelController::class, 'index'])
        ->defaults('educationType', 'college')->name('admin.college.year-levels');
    Route::get('/admin/senior-high/year-levels', [YearLevelController::class, 'index'])
        ->defaults('educationType', 'senior-high')->name('admin.senior-high.year-levels');
    Route::get('/admin/junior-high/grade-levels', [YearLevelController::class, 'index'])
        ->defaults('educationType', 'junior-high')->name('admin.junior-high.grade-levels');
    Route::get('/admin/grade-school/grade-levels', [YearLevelController::class, 'index'])
        ->defaults('educationType', 'grade-school')->name('admin.grade-school.grade-levels');
    Route::post('/admin/year-levels', [YearLevelController::class, 'store']);
    Route::put('/admin/year-levels/{yearLevel}', [YearLevelController::class, 'update']);
    Route::delete('/admin/year-levels/{yearLevel}', [YearLevelController::class, 'destroy']);

    // Senior High Strands
    Route::get('/admin/senior-high/strands', [StrandController::class, 'index'])->name('admin.senior-high.strands');
    Route::post('/admin/senior-high/strands', [StrandController::class, 'store']);
    Route::put('/admin/senior-high/strands/{strand}', [StrandController::class, 'update']);
    Route::delete('/admin/senior-high/strands/{strand}', [StrandController::class, 'destroy']);

    // Students
    Route::get('/admin/students', [StudentController::class, 'index'])->name('admin.students');
    Route::post('/admin/students', [StudentController::class, 'store']);
    Route::put('/admin/students/{student}', [StudentController::class, 'update']);
    Route::delete('/admin/students/{student}', [StudentController::class, 'destroy']);

    // Teachers
    Route::get('/admin/teachers', [TeacherController::class, 'index'])->name('admin.teachers');
    Route::post('/admin/teachers', [TeacherController::class, 'store']);
    Route::put('/admin/teachers/{teacher}', [TeacherController::class, 'update']);
    Route::delete('/admin/teachers/{teacher}', [TeacherController::class, 'destroy']);

    // Employees
    Route::get('/admin/employees', [EmployeeController::class, 'index'])->name('admin.employees');
    Route::post('/admin/employees', [EmployeeController::class, 'store']);
    Route::put('/admin/employees/{employee}', [EmployeeController::class, 'update']);
    Route::delete('/admin/employees/{employee}', [EmployeeController::class, 'destroy']);

    // Questions
    Route::get('/admin/questions', [QuestionController::class, 'index'])->name('admin.questions');
    Route::post('/admin/questions', [QuestionController::class, 'store']);
    Route::put('/admin/questions/{id}', [QuestionController::class, 'update']);
    Route::delete('/admin/questions/{id}', [QuestionController::class, 'destroy']);

    // Questionnaires
    Route::get('/admin/questionnaires', [QuestionnaireController::class, 'index'])->name('admin.questionnaires');
    Route::post('/admin/questionnaires', [QuestionnaireController::class, 'store']);
    Route::put('/admin/questionnaires/{id}', [QuestionnaireController::class, 'update']);
    Route::delete('/admin/questionnaires/{id}', [QuestionnaireController::class, 'destroy']);

    // Assignments
    Route::get('/admin/questionnaire-distribution', [AssignmentController::class, 'index'])->name('admin.questionnaire-distribution');
    Route::get('/admin/subject-assignments', [AssignmentController::class, 'subjectAssignments'])->name('admin.subject-assignments');
    Route::get('/admin/peer-assignments', [AssignmentController::class, 'peerAssignments'])->name('admin.peer-assignments');
    Route::get('/admin/head-assignments', [AssignmentController::class, 'headAssignments'])->name('admin.head-assignments');
    Route::get('/admin/employee-assignments', [AssignmentController::class, 'employeeAssignments'])->name('admin.employee-assignments');
    Route::post('/admin/assignments', [AssignmentController::class, 'store']);
    Route::delete('/admin/assignments/{id}', [AssignmentController::class, 'destroy']);

    // Ratings & Reports
    Route::get('/admin/subject-ratings', [RatingsController::class, 'subjectRatings'])->name('admin.subject-ratings');
    Route::get('/admin/peer-ratings', [RatingsController::class, 'peerRatings'])->name('admin.peer-ratings');
    Route::get('/admin/employee-ratings', [RatingsController::class, 'employeeRatings'])->name('admin.employee-ratings');
    Route::get('/admin/subject-archives', [RatingsController::class, 'subjectArchives'])->name('admin.subject-archives');
    Route::get('/admin/peer-archives', [RatingsController::class, 'peerArchives'])->name('admin.peer-archives');
    Route::get('/admin/employee-archives', [RatingsController::class, 'employeeArchives'])->name('admin.employee-archives');

    // Head & Branch ratings
    Route::get('/admin/head-ratings', [RatingsController::class, 'headRatings'])->name('admin.head-ratings');
    Route::get('/admin/branch-ratings', [RatingsController::class, 'branchRatings'])->name('admin.branch-ratings');

    // Archive / restore per rating type
    Route::post('/admin/ratings/{type}/{id}/archive', [RatingsController::class, 'archive'])
        ->whereIn('type', ['subject', 'peer', 'employee', 'head', 'branch'])
        ->name('admin.ratings.archive');
    Route::post('/admin/ratings/{type}/{id}/restore', [RatingsController::class, 'restore'])
        ->whereIn('type', ['subject', 'peer', 'employee', 'head', 'branch'])
        ->name('admin.ratings.restore');

    // Exports & Printable Summary
    Route::get('/admin/subject-ratings/export', [RatingsController::class, 'exportSubject'])->name('admin.subject-ratings.export');
    Route::get('/admin/peer-ratings/export', [RatingsController::class, 'exportPeer'])->name('admin.peer-ratings.export');
    Route::get('/admin/employee-ratings/export', [RatingsController::class, 'exportEmployee'])->name('admin.employee-ratings.export');
    Route::get('/admin/head-ratings/export', [RatingsController::class, 'exportHead'])->name('admin.head-ratings.export');
    Route::get('/admin/branch-ratings/export', [RatingsController::class, 'exportBranch'])->name('admin.branch-ratings.export');
    Route::get('/admin/reports/summary', [RatingsController::class, 'summaryReport'])->name('admin.reports.summary');

    // Outstanding Awards
    Route::get('/admin/outstanding-awards', [OutstandingAwardsController::class, 'index'])->name('admin.outstanding-awards');
    Route::post('/admin/outstanding-awards/recompute', [OutstandingAwardsController::class, 'recompute'])->name('admin.outstanding-awards.recompute');

    // System Controls — superadmin & overalladmin access
    Route::middleware('role:superadmin,overalladmin')->group(function () {
        Route::get('/admin/departments', [DepartmentController::class, 'index'])->name('admin.departments');
        Route::post('/admin/departments', [DepartmentController::class, 'store']);
        Route::put('/admin/departments/{department}', [DepartmentController::class, 'update']);
        Route::delete('/admin/departments/{department}', [DepartmentController::class, 'destroy']);

        Route::get('/admin/branches', [BranchController::class, 'index'])->name('admin.branches');
        Route::post('/admin/branches', [BranchController::class, 'store']);
        Route::put('/admin/branches/{branch}', [BranchController::class, 'update']);
        Route::delete('/admin/branches/{branch}', [BranchController::class, 'destroy']);

        Route::get('/admin/evaluation-cycle', [EvaluationCycleController::class, 'index'])->name('admin.evaluation-cycle');
        Route::post('/admin/evaluation-cycle', [EvaluationCycleController::class, 'store']);
        Route::put('/admin/evaluation-cycle/{id}', [EvaluationCycleController::class, 'update']);
        Route::delete('/admin/evaluation-cycle/{id}', [EvaluationCycleController::class, 'destroy']);

        Route::get('/admin/admin-users', [AdminUserController::class, 'index'])->name('admin.admin-users');
        Route::post('/admin/admin-users', [AdminUserController::class, 'store']);
        Route::put('/admin/admin-users/{admin}', [AdminUserController::class, 'update']);
        Route::delete('/admin/admin-users/{admin}', [AdminUserController::class, 'destroy']);

        Route::get('/admin/audit-logs', [AuditLogController::class, 'index'])->name('admin.audit-logs');
    });

    // Bulk CSV imports
    Route::post('/admin/import/students', [BulkImportController::class, 'students'])->name('admin.import.students');
    Route::post('/admin/import/teachers', [BulkImportController::class, 'teachers'])->name('admin.import.teachers');
    Route::post('/admin/import/employees', [BulkImportController::class, 'employees'])->name('admin.import.employees');

    // Global search
    Route::get('/admin/search', [GlobalSearchController::class, 'search'])->name('admin.search');

    // Bug Reports
    Route::post('/bug-report', [BugReportController::class, 'store'])->name('bug-report.store');

    // Notifications (admin)
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read')->whereNumber('id');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::delete('/notifications/clear', [NotificationController::class, 'clear'])->name('notifications.clear');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// ─── Client (Student / Teacher) Portal ───────────────────────────────────────

Route::prefix('portal')->name('portal.')->group(function () {
    // Login — redirect to dashboard if already authenticated
    Route::get('/login', [ClientLoginController::class, 'showLogin'])->name('login');
    Route::post('/logout', [ClientLoginController::class, 'logout'])->name('logout');
    Route::post('/bug-report', [BugReportController::class, 'store'])->name('bug-report.store');

    // Password reset for client users (student / teacher / employee)
    Route::get('/password/forgot', [ClientPasswordResetController::class, 'showRequest'])->name('password.request');
    Route::post('/password/forgot', [ClientPasswordResetController::class, 'sendLink'])->name('password.email')
        ->middleware('throttle:5,10');
    Route::get('/password/reset', [ClientPasswordResetController::class, 'showReset'])->name('password.reset');
    Route::post('/password/reset', [ClientPasswordResetController::class, 'reset'])->name('password.update')
        ->middleware('throttle:5,10');

    // Portal notifications (student / teacher / employee)
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read')->whereNumber('id');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::delete('/notifications/clear', [NotificationController::class, 'clear'])->name('notifications.clear');

    // Student portal
    Route::middleware('student.auth')->group(function () {
        Route::get('/student', [StudentPortalController::class, 'dashboard'])->name('student.dashboard');
    });

    // Teacher / faculty portal
    Route::middleware('teacher.auth')->group(function () {
        Route::get('/teacher', [TeacherPortalController::class, 'dashboard'])->name('teacher.dashboard');
    });

    // Employee portal
    Route::middleware('employee.auth')->group(function () {
        Route::get('/employee', [EmployeePortalController::class, 'dashboard'])->name('employee.dashboard');
        Route::get('/employee/evaluate', [EmployeePortalController::class, 'evaluateForm'])->name('employee.evaluate');
        Route::post('/employee/evaluate', [EmployeePortalController::class, 'submitEvaluation'])->name('employee.evaluate.submit');
    });
});

require __DIR__.'/auth.php';
