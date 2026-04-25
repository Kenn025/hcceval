<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * Password helper that verifies against either bcrypt OR legacy MD5
 * and silently upgrades MD5 rows to bcrypt on successful login.
 *
 * The MD5 fallback is intentional and time-limited — once every active
 * user has logged in once after this rollout, run `php artisan auth:rehash --prune`
 * to remove the remaining stale MD5 rows (or invalidate them and force a reset).
 */
class LegacyHash
{
    /**
     * Hash a new password using bcrypt. Always use this for writes.
     */
    public static function make(string $plain): string
    {
        return Hash::make($plain);
    }

    /**
     * Verify $plain against the stored hash. Accepts both bcrypt and legacy MD5.
     * If MD5 matches, silently rehash to bcrypt against the given table/id.
     */
    public static function check(string $plain, ?string $stored, ?string $table = null, int|string|null $id = null): bool
    {
        if (! is_string($stored) || $stored === '') {
            return false;
        }

        // Native bcrypt / argon — Laravel's Hash::check handles all supported algorithms.
        if (self::looksHashed($stored)) {
            return Hash::check($plain, $stored);
        }

        // Legacy MD5 (32 hex chars). Use hash_equals to avoid timing attacks.
        if (strlen($stored) === 32 && ctype_xdigit($stored) && hash_equals(strtolower($stored), md5($plain))) {
            self::upgrade($plain, $table, $id);
            return true;
        }

        return false;
    }

    /**
     * Rehash a legacy row to bcrypt. Best-effort — never let this break login.
     */
    private static function upgrade(string $plain, ?string $table, int|string|null $id): void
    {
        if (! $table || ! $id) {
            return;
        }

        try {
            DB::table($table)->where('id', $id)->update([
                'password'   => Hash::make($plain),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning("LegacyHash upgrade failed for {$table}#{$id}: " . $e->getMessage());
        }
    }

    private static function looksHashed(string $stored): bool
    {
        // bcrypt: $2y$ / $2a$ / $2b$, argon2: $argon2i$ / $argon2id$
        return str_starts_with($stored, '$2y$')
            || str_starts_with($stored, '$2a$')
            || str_starts_with($stored, '$2b$')
            || str_starts_with($stored, '$argon2');
    }
}
