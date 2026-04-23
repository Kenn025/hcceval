<?php

use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AssignmentController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\EvaluationCycleController;
use App\Http\Controllers\Admin\ProgramController;
use App\Http\Controllers\Admin\QuestionController;
use App\Http\Controllers\Admin\RatingsController;
use App\Http\Controllers\Admin\StrandController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Admin\SubjectController;
use App\Http\Controllers\Admin\TeacherController;
use App\Http\Controllers\Admin\YearLevelController;
use App\Http\Controllers\Client\ClientLoginController;
use App\Http\Controllers\Client\StudentPortalController;
use App\Http\Controllers\Client\TeacherPortalController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
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
    Route::put('/admin/teachers/{employee}', [TeacherController::class, 'update']);
    Route::delete('/admin/teachers/{employee}', [TeacherController::class, 'destroy']);

    // Questions
    Route::get('/admin/subject-questions', [QuestionController::class, 'subjectQuestions'])->name('admin.subject-questions');
    Route::get('/admin/peer-questions', [QuestionController::class, 'peerQuestions'])->name('admin.peer-questions');
    Route::get('/admin/employee-questions', [QuestionController::class, 'employeeQuestions'])->name('admin.employee-questions');
    Route::post('/admin/questions', [QuestionController::class, 'store']);
    Route::put('/admin/questions/{id}', [QuestionController::class, 'update']);
    Route::delete('/admin/questions/{id}', [QuestionController::class, 'destroy']);

    // Assignments
    Route::get('/admin/subject-assignments', [AssignmentController::class, 'subjectAssignments'])->name('admin.subject-assignments');
    Route::get('/admin/peer-assignments', [AssignmentController::class, 'peerAssignments'])->name('admin.peer-assignments');
    Route::get('/admin/employee-assignments', [AssignmentController::class, 'employeeAssignments'])->name('admin.employee-assignments');
    Route::post('/admin/assignments', [AssignmentController::class, 'store']);
    Route::delete('/admin/assignments/{id}', [AssignmentController::class, 'destroy']);

    // Ratings & Reports
    Route::get('/admin/subject-ratings', [RatingsController::class, 'subjectRatings'])->name('admin.subject-ratings');
    Route::get('/admin/peer-ratings', [RatingsController::class, 'peerRatings'])->name('admin.peer-ratings');
    Route::get('/admin/employee-ratings', [RatingsController::class, 'employeeRatings'])->name('admin.employee-ratings');
    Route::get('/admin/subject-archives', [RatingsController::class, 'subjectArchives'])->name('admin.subject-archives');
    Route::get('/admin/peer-archives', [RatingsController::class, 'peerArchives'])->name('admin.peer-archives');

    // System Controls — superadmin only
    Route::middleware('role:superadmin')->group(function () {
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
    });

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// ─── Client (Student / Teacher) Portal ───────────────────────────────────────

Route::prefix('portal')->name('portal.')->group(function () {
    // Unified login entry point
    Route::redirect('/login', '/login')->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('login.submit');
    Route::post('/logout', [ClientLoginController::class, 'logout'])->name('logout');

    // Student portal
    Route::middleware('student.auth')->group(function () {
        Route::get('/student', [StudentPortalController::class, 'dashboard'])->name('student.dashboard');
    });

    // Teacher portal
    Route::middleware('teacher.auth')->group(function () {
        Route::get('/teacher', [TeacherPortalController::class, 'dashboard'])->name('teacher.dashboard');
    });
});

require __DIR__.'/auth.php';
