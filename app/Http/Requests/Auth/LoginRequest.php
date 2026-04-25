<?php

namespace App\Http\Requests\Auth;

use App\Models\Employee;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Notifications\TwoFactorCode;
use App\Services\AuditLogger;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
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
            $twoFactor = Schema::hasColumn('admin', 'two_factor_enabled') && (int) ($admin->two_factor_enabled ?? 0) === 1;

            if ($twoFactor && ! empty($admin->email)) {
                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

                DB::table('two_factor_tokens')->insert([
                    'subject_type' => 'admin',
                    'subject_id'   => $admin->id,
                    'code_hash'    => Hash::make($code),
                    'expires_at'   => now()->addMinutes(10),
                    'created_at'   => now(),
                ]);

                Notification::route('mail', $admin->email)->notify(new TwoFactorCode($code));

                session(['2fa_pending' => [
                    'admin_id'  => $admin->id,
                    'email'     => $admin->email,
                    'name'      => $admin->name,
                    'role'      => $admin->role ?? 'admin',
                    'branch_id' => $admin->branch_id,
                    'remember'  => $this->boolean('remember'),
                ]]);

                RateLimiter::clear($this->throttleKey());
                $this->merge(['login_destination' => '2fa']);
                return;
            }

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

            AuditLogger::record('auth.login', 'admin', $admin->id);

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

        AuditLogger::record('auth.failed', null, null, ['identifier' => $identifier]);

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
