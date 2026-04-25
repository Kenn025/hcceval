<?php

namespace Tests\Feature\Auth;

use App\Notifications\TwoFactorCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminLoginSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_throttle_locks_after_five_failed_attempts(): void
    {
        $user = User::factory()->create();
        $key = $this->throttleKey($user->email);

        RateLimiter::clear($key);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $response = $this->from(route('login'))->post(route('login.submit'), [
                'identifier' => $user->email,
                'password' => 'wrong-password',
            ]);

            $response->assertRedirect(route('login'));
            $response->assertSessionHasErrors('identifier');
        }

        $locked = $this->from(route('login'))->post(route('login.submit'), [
            'identifier' => $user->email,
            'password' => 'wrong-password',
        ]);

        $locked->assertRedirect(route('login'));
        $locked->assertSessionHasErrors('identifier');

        $this->assertTrue(RateLimiter::tooManyAttempts($key, 5));
        $this->assertStringContainsString(
            'Too many login attempts',
            session('errors')->getBag('default')->first('identifier')
        );

        RateLimiter::clear($key);
    }

    public function test_two_factor_challenge_is_required_for_admins_with_two_factor_enabled(): void
    {
        Notification::fake();

        DB::table('admin')->insert([
            'code' => 'ADM-001',
            'name' => 'Secure Admin',
            'role' => 'superadmin',
            'branch_id' => null,
            'email' => 'secure-admin@example.com',
            'password' => Hash::make('secret-pass'),
            'two_factor_enabled' => 1,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->post(route('login.submit'), [
            'identifier' => 'secure-admin@example.com',
            'password' => 'secret-pass',
        ]);

        $response->assertRedirect(route('two-factor.challenge'));
        $this->assertGuest();
        $this->assertDatabaseCount('two_factor_tokens', 1);

        $pending = session('2fa_pending');

        $this->assertIsArray($pending);
        $this->assertSame('secure-admin@example.com', $pending['email'] ?? null);
        $this->assertSame('Secure Admin', $pending['name'] ?? null);

        Notification::assertSentOnDemand(
            TwoFactorCode::class,
            function (TwoFactorCode $notification, array $channels, object $notifiable): bool {
                return in_array('mail', $channels, true)
                    && ($notifiable->routes['mail'] ?? null) === 'secure-admin@example.com'
                    && preg_match('/^\d{6}$/', $notification->code) === 1;
            }
        );
    }

    private function throttleKey(string $identifier): string
    {
        return Str::transliterate(Str::lower($identifier) . '|127.0.0.1');
    }
}
