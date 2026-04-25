# CLAUDE.md — Project rules for AI assistants

> This file is auto-loaded by Claude Code. Cursor reads `.cursorrules` (which mirrors this file). All AI tools working on this repo must follow it.

## Before doing ANY task on this repo

1. **Read `docs/PROGRESS_REPORT.md` first.** It contains the binding scorecard, top-5 priorities, conventions, and anti-patterns.
2. **Compare the user's prompt to the priorities and conventions there.**
3. **If the user's request is unrelated to the top-5 priorities, or appears to contradict a "Conventions to preserve" or "Anti-patterns" item, STOP and ASK before writing code.** Use this template:

   > "I checked `docs/PROGRESS_REPORT.md`. Your request `<X>` looks like it `<is unrelated to / conflicts with>` the recommendation `<Y>`. Do you still want to proceed, or should I work on `<priority item>` instead?"

4. **Never silently violate the conventions** (e.g. inline `$request->validate()` instead of FormRequest, new MD5 hashing, hard-deletes on legacy tables, bypassing branch scoping).

## Project at a glance

- **Stack:** Laravel 12, Inertia 2, React 18, Tailwind, MySQL, PHP 8.2+
- **Domain:** HCC Faculty/Employee Evaluation System (capstone). Legacy tables (`student`, `teacher`, `employee`, `admin`, `branch`, `department`, `program`, `strand`, `subject`, `academic_year`) are read by the new app — do not rename or restructure them.
- **Frontend pages:** `resources/js/Pages/` using `AdminLayout` / `PortalLayout` / `ClientLayout`.
- **Branch scoping:** every admin list query must apply `$this->scopedBranchId()` from `app/Http/Controllers/Controller.php`.

## Hard rules (do not break)

1. **No new MD5 / SHA1 hashing.** Use `Hash::make(...)` (bcrypt). Existing legacy MD5 is being migrated — see priority #1 in the report.
2. **Validation goes in FormRequest classes** under `app/Http/Requests/`. Do not add inline `$request->validate()` to controller actions in new code.
3. **Cross-cutting side-effects must use existing services**, not duplicated logic:
   - `App\Services\AppNotifier` — in-app bell
   - `App\Services\EvaluationNotifier` — eval cycle email + bell
   - `App\Services\AuditLogger` — admin/auth audit trail
4. **No hard deletes** on domain tables. Set `is_deleted = 1`.
5. **No bypassing auth middleware** (`EnsureAdminRole`, `student.auth`, `teacher.auth`, `employee.auth`, `role:superadmin,overalladmin`).
6. **No new composer/npm dependency** for something Laravel/Tailwind already provides. Justify any new package.
7. **Inertia + React + Tailwind only.** No Vue, Livewire, Alpine, or alternative styling solutions.
8. **Migrations** must include a working `down()` method and must be additive (no renaming or dropping legacy tables).
9. **Confirmation dialogs** — use `resources/js/Components/ConfirmDialog.jsx` for destructive or irreversible UI actions (when added). Do not use browser `confirm()` in new code.
10. **No git history rewrites without explicit user permission.** No `--force`, no `--amend` of pushed commits, no `--no-verify`.

## Workflow rules

- Run `php artisan pail` (Laravel logs) when debugging notifications, mail, or 2FA — `MAIL_MAILER=log` writes to `storage/logs/laravel.log`.
- Frontend changes need `npm run dev` (or `npm run build` for production) to be visible.
- After schema changes, run `php artisan migrate` then verify with `php artisan db:show`.
- Tests live in `tests/Feature/` — PHPUnit + Laravel TestCase. Coverage is currently low; new flows should have a feature test.

## When the user vibe-codes

If the user says "just do it" / "vibe code" / "yolo" without context, **still apply the rules above silently** — but you may skip the confirmation step in rule #3 of "Before doing ANY task" if the request is clearly inside the scope of a current top-5 priority. Always preserve hard rules even in vibe mode.

## Completing a task

- After the change, briefly note which priority/category in `docs/PROGRESS_REPORT.md` it advances (e.g. "moves Reliability from 50% -> ~60% by adding 1 feature test").
- If the change creates a new convention, propose updating `docs/PROGRESS_REPORT.md` -> "Conventions to preserve".

---

For the full evaluation, see `docs/PROGRESS_REPORT.md`.
