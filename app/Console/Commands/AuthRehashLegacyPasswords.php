<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Audit the legacy password tables for stale MD5 hashes.
 *
 * By default this is read-only — it reports counts.
 * --prune  : invalidates lingering MD5 rows by replacing them with random
 *            bcrypt hashes, forcing affected users to use the password-reset flow.
 *
 * We do NOT bulk-convert MD5 -> bcrypt without the plaintext, because we
 * never stored the plaintext. Users get upgraded automatically when they
 * log in (see App\Services\LegacyHash::check). --prune is the cutover step
 * once the rollout has been live long enough.
 */
class AuthRehashLegacyPasswords extends Command
{
    protected $signature = 'auth:rehash {--prune : Invalidate lingering MD5 rows so affected accounts must reset their password}';

    protected $description = 'Audit and optionally invalidate legacy MD5 password rows in admin/student/teacher/employee tables.';

    public function handle(): int
    {
        $tables = ['admin', 'student', 'teacher', 'employee'];
        $prune  = (bool) $this->option('prune');
        $totalLegacy = 0;
        $totalPruned = 0;

        foreach ($tables as $table) {
            $rows = DB::table($table)
                ->select('id', 'password')
                ->where('is_deleted', 0)
                ->get();

            $legacy = 0;
            $pruned = 0;

            foreach ($rows as $row) {
                if (! $this->isLegacyMd5($row->password)) {
                    continue;
                }

                $legacy++;

                if ($prune) {
                    DB::table($table)->where('id', $row->id)->update([
                        'password'   => Hash::make(Str::random(40)),
                        'updated_at' => now(),
                    ]);
                    $pruned++;
                }
            }

            $totalLegacy += $legacy;
            $totalPruned += $pruned;

            $this->line(sprintf(
                '  %-10s legacy MD5: %d%s',
                $table,
                $legacy,
                $prune ? ", invalidated: {$pruned}" : '',
            ));
        }

        $this->newLine();
        $this->info("Total legacy MD5 rows: {$totalLegacy}");

        if ($prune) {
            $this->warn("Invalidated {$totalPruned} accounts. Affected users must use the password-reset flow to regain access.");
        } elseif ($totalLegacy > 0) {
            $this->comment('Run with --prune once you are ready to cut over. Until then, MD5 rows upgrade silently on next successful login.');
        }

        return self::SUCCESS;
    }

    private function isLegacyMd5(?string $value): bool
    {
        return is_string($value)
            && strlen($value) === 32
            && ctype_xdigit($value);
    }
}
