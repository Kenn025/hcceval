<?php

namespace App\Http\Requests\Auth;

use App\Models\Employee;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }

    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $identifier = $this->string('identifier')->toString();
        $password = $this->string('password')->toString();

        // Check legacy admin table; passwords are stored as MD5.
        $admin = DB::table('admin')
            ->where(function ($query) use ($identifier) {
                $query->where('email', $identifier)
                    ->orWhere('code', $identifier);
            })
            ->where('is_deleted', 0)
            ->first();

        if ($admin && $admin->password === md5($password)) {
            $user = User::firstOrCreate(
                ['email' => $admin->email],
                ['name' => $admin->name, 'password' => bcrypt($password)]
            );

            Auth::login($user, $this->boolean('remember'));

            session([
                'admin_role' => $admin->role ?? 'admin',
                'admin_branch_id' => $admin->branch_id,
                'admin_id' => $admin->id,
            ]);

            RateLimiter::clear($this->throttleKey());

            $this->merge(['login_destination' => 'admin']);

            return;
        }

        $student = Student::with('branch')
            ->where(function ($query) use ($identifier) {
                $query->where('email', $identifier)
                    ->orWhere('code', $identifier);
            })
            ->where('is_deleted', 0)
            ->first();

        if ($student && $student->password === md5($password)) {
            session([
                'client_type' => 'student',
                'client_source' => 'student',
                'client_id' => $student->id,
                'client_name' => $student->full_name,
                'client_branch' => $student->branch?->name ?? '',
            ]);

            RateLimiter::clear($this->throttleKey());

            $this->merge(['login_destination' => 'student']);

            return;
        }

        $teacher = Teacher::with('branch')
            ->where(function ($query) use ($identifier) {
                $query->where('email', $identifier)
                    ->orWhere('code', $identifier);
            })
            ->where('is_deleted', 0)
            ->first();

        if ($teacher && $teacher->password === md5($password)) {
            session([
                'client_type' => 'faculty',
                'client_source' => 'teacher',
                'client_id' => $teacher->id,
                'client_name' => $teacher->full_name,
                'client_branch' => $teacher->branch?->name ?? '',
                'client_role' => $teacher->role ?? 'teacher',
            ]);

            RateLimiter::clear($this->throttleKey());

            $this->merge(['login_destination' => 'teacher']);

            return;
        }

        $employee = Employee::with('branch')
            ->where(function ($query) use ($identifier) {
                $query->where('email', $identifier)
                    ->orWhere('code', $identifier);
            })
            ->where('is_deleted', 0)
            ->first();

        if ($employee && $employee->password === md5($password)) {
            session([
                'client_type' => 'faculty',
                'client_source' => 'employee',
                'client_id' => $employee->id,
                'client_name' => $employee->full_name,
                'client_branch' => $employee->branch?->name ?? '',
                'client_role' => $employee->role ?? 'faculty',
            ]);

            RateLimiter::clear($this->throttleKey());

            $this->merge(['login_destination' => 'employee']);

            return;
        }

        if (Auth::attempt(['email' => $identifier, 'password' => $password], $this->boolean('remember'))) {
            RateLimiter::clear($this->throttleKey());

            $this->merge(['login_destination' => 'admin']);

            return;
        }

        RateLimiter::hit($this->throttleKey());

        throw ValidationException::withMessages([
            'identifier' => trans('auth.failed'),
        ]);
    }

    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'identifier' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('identifier')) . '|' . $this->ip());
    }
}
