<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClientLoginController extends Controller
{
    public function showLogin(): Response
    {
        if (session('client_type') === 'student' && session('client_id')) {
            return Inertia::location(route('portal.student.dashboard'));
        }

        if (session('client_type') === 'faculty' && session('client_id')) {
            return Inertia::location(route('portal.teacher.dashboard'));
        }

        return Inertia::render('Auth/ClientLogin', [
            'status' => session('status'),
            'error'  => session('error'),
        ]);
    }

    public function login(Request $request): RedirectResponse
    {
        $request->validate([
            'identifier' => ['required', 'string'],
            'password'   => ['required', 'string'],
        ]);

        $identifier = trim($request->input('identifier'));
        $password   = $request->input('password');

        // Try students table
        $student = Student::with('branch')
            ->where(fn ($q) => $q->where('student_no', $identifier)->orWhere('email', $identifier))
            ->whereNull('deleted_at')
            ->first();

        if ($student && Hash::check($password, $student->password)) {
            $request->session()->regenerate();
            session([
                'client_type'   => 'student',
                'client_id'     => $student->id,
                'client_name'   => $student->full_name,
                'client_branch' => $student->branch?->name ?? '',
            ]);

            return redirect()->route('portal.student.dashboard');
        }

        // Try employees table
        $employee = Employee::with('branch')
            ->where(fn ($q) => $q->where('employee_no', $identifier)->orWhere('email', $identifier))
            ->whereNull('deleted_at')
            ->first();

        if ($employee && Hash::check($password, $employee->password)) {
            $request->session()->regenerate();
            session([
                'client_type'   => 'faculty',
                'client_id'     => $employee->id,
                'client_name'   => $employee->full_name,
                'client_branch' => $employee->branch?->name ?? '',
                'client_role'   => $employee->role ?? 'faculty',
            ]);

            return redirect()->route('portal.teacher.dashboard');
        }

        throw ValidationException::withMessages([
            'identifier' => 'Invalid ID or password. Please try again.',
        ]);
    }

    public function logout(Request $request): RedirectResponse
    {
        $request->session()->forget(['client_type', 'client_id', 'client_name', 'client_branch', 'client_role']);

        return redirect()->route('portal.login');
    }
}
