<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
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
            'password'   => ['required', 'string'],
        ];
    }

    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $identifier = $this->string('identifier')->toString();
        $password   = $this->string('password')->toString();

        // Check admins table (v3 plural) — passwords are stored as MD5
        $admin = DB::table('admins')
            ->where('admin_email', $identifier)
            ->where('is_deleted', 0)
            ->first();

        if ($admin && $admin->admin_password === md5($password)) {
            $user = User::firstOrCreate(
                ['email' => $admin->admin_email],
                ['name' => $admin->admin_name, 'password' => bcrypt($password)]
            );
            Auth::login($user, $this->boolean('remember'));
            session([
                'admin_role'      => $admin->role ?? 'admin',
                'admin_branch_id' => $admin->branch_id,
                'admin_id'        => $admin->admin_id,
            ]);
            RateLimiter::clear($this->throttleKey());
            return;
        }

        // Fallback: standard Laravel users table (bcrypt)
        if (Auth::attempt(['email' => $identifier, 'password' => $password], $this->boolean('remember'))) {
            RateLimiter::clear($this->throttleKey());
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
