# HCC Eval — Progress Report & ISO/IEC 25010 Readiness

**Last reviewed:** 2026-04-26
**Branch reviewed:** `JaeL` (in sync with `main` at `5bc4084`)
**Evaluation framework:** ISO/IEC 25010 — the 8 software-quality categories used as the standard rubric for capstone / IT system defense in Philippine universities.

---

## Purpose of this document

1. Single source of truth for the team about **what is finished**, **what is still partial**, and **what is missing**.
2. Reference document AI assistants (Claude Code, Cursor, Copilot Chat, etc.) **must check before any code change** — to prevent vibe-coding that contradicts current conventions, weakens security, or burns time on items that aren't the bottleneck.
3. Roadmap for the final push before defense.

> If you are an AI tool reading this: see `CLAUDE.md` / `.cursorrules` at the repo root for binding rules. **Before generating any code, compare the user's request against the "Top 5 priority fixes" and "Conventions to preserve" sections below.** If the request is unrelated or contradicts a rule, surface the conflict to the user before proceeding.

---

## Overall scorecard

| # | Category                | Score | Status |
|---|-------------------------|-------|--------|
| 1 | Functional Suitability  | 95%   | Sidebar nav entries added for Audit Logs, Outstanding Awards, Head/Branch Ratings, Employee Archives |
| 2 | Performance Efficiency  | 60%   | Needs evidence |
| 3 | Compatibility           | 70%   | Demonstrable |
| 4 | Usability               | 85%   | ConfirmDialog wired across destructive actions (Export, Print, Recompute, Submit Evaluation, Mark-all-read, Clear) |
| 5 | Reliability             | 70%   | Five defense-priority feature tests are now passing |
| 6 | Security                | 80%   | MD5 migration done — bcrypt with on-login rehash |
| 7 | Maintainability         | 80%   | Pass-ready |
| 8 | Portability             | 50%   | Deploy doc required |
|   | **Weighted average**    | **76%** | **Pass-ready — finish remaining top-5 items to reach 90%+** |

---

## 1. Functional Suitability — *does it do what it is supposed to do?*

**Score: 90% — strongest area.**

### Done
- User management — Students, Teachers, Employees, Admin Users (CRUD + branch scoping + auto code generation)
- Academic management — Branches, Departments, Programs, Strands, Subjects, Year/Grade levels
- Questionnaire management — Questions (subject/peer/employee/head) + Questionnaires + Distribution
- Assignments — Subject / Peer / Head / Employee + custom subjects
- Ratings — Subject / Peer / Employee / Head / Branch views with archives
- Reports — CSV exports for all 5 rating types + printable HTML summary report
- Outstanding Awards — auto-computation by branch/AY (top teachers, chairs, programs, strands)
- Evaluation flows — Student, Teacher, Employee submission endpoints
- Notifications — email + in-app bell (window opened/closed, reminders, password reset, 2FA)
- Bug Reporting, Audit Logs, Bulk CSV import, Global Search

### Partial
- Confirmation dialogs missing on destructive/important actions (Export, Recompute Awards, Submit Evaluation, Archive/Restore, Mark-all-read).
- Submission lock works server-side but no visible "submitted" badge with timestamp on Teacher/Employee dashboards.

### Missing
- **Sidebar nav entries** for Audit Logs, Outstanding Awards, Head Ratings, Branch Ratings — pages exist but admins cannot reach them without typing the URL.

### Recommendation
Add the missing sidebar entries and ship the confirmation dialogs (~1 day). Closes the only Functional gaps.

---

## 2. Performance Efficiency — *is it fast under load?*

**Score: 60% — biggest weak point at scale.**

### Done
- Pagination (20 per page) on every list endpoint
- DB indexes on every FK + most filterable columns
- Targeted `select(...)` (no `SELECT *`)
- Eloquent eager-loading with `with(...)`

### Partial
- Dashboard runs multiple `count()` queries on every visit (no caching).
- `cache.store=database`, `queue=database` — fine for thesis demo, slow under real traffic.

### Missing
- No N+1 audit performed; outstanding-awards command re-queries per branch.
- No frontend bundle splitting (Inertia ships all 35+ pages at once).
- No DB query log review, no APM telemetry, no benchmarks.

### Recommendation
Run Laravel Debugbar on Dashboard, Ratings, and Outstanding Awards pages. Capture screenshots of query counts/timings as evidence for the panel. Promise Redis cache for production.

---

## 3. Compatibility — *does it work with other systems / browsers?*

**Score: 70%.**

### Done
- CSV import/export uses standards (`text/csv`, BOM-prefixed UTF-8) — opens cleanly in Excel/Sheets.
- Email via standard SMTP (whatever driver `.env` configures).
- Inertia + Tailwind: tested on Chrome/Edge/Firefox/Safari.

### Partial
- Mobile responsiveness was recently improved (PR #12) but not every page hand-tested at < 400px.

### Missing
- No public API for integration with registrar/payroll.
- No SSO / Google Workspace login (HCC likely already uses Google for Education).

### Recommendation
Demonstrate CSV exports opening in MS Excel and emails arriving in Gmail/Outlook during the live demo — sufficient evidence for the rubric.

---

## 4. Usability — *can users figure it out without training?*

**Score: 75%.**

### Done
- Clean Tailwind UI, consistent admin layout with sidebar groups
- Global search bar, AY filter, breadcrumbs
- Notification bell (in-app feed) on both admin and portal
- Session-timeout warning component
- Bug-report modal accessible everywhere
- Dark-mode toggle (PortalLayout)

### Partial
- No onboarding / empty-state guidance for first-time admins (blank tables, unclear seed order).
- Confirmation dialogs not yet wired — destructive actions feel risky.
- No keyboard shortcuts, no inline help / tooltips on form fields.

### Missing
- No user manual / `/help` page inside the app — panel **will** ask about this.
- No guided tour.
- No accessibility audit (labels, ARIA, focus traps).

### Recommendation
Build a 1-page `/help` route with a static manual + screenshots, and wire `ConfirmDialog` everywhere (Export, Submit, Recompute, Archive, Mark-all-read). High-impact, low-effort.

---

## 5. Reliability — *does it stay up; does it recover from failure?*

**Score: 70% — materially improved, with defense-ready test evidence now in place.**

### Done
- Soft deletes (`is_deleted`) prevent accidental data loss
- Database-backed queue (jobs survive restarts)
- Audit log captures every admin action
- 2FA + login throttling (5 attempts) protects accounts
- Notifications wrapped in `try/catch` — broken SMTP will not 500 the request
- Feature tests now cover:
1. Student submits subject evaluation -> `ratings_subject` aggregates
2. Employee submits peer evaluation -> `ratings_employee` aggregates
3. Employee submits head evaluation -> `ratings_head` aggregates
4. Duplicate employee submission is blocked
5. Login lockout triggers after 5 failed attempts
6. Admin 2FA challenge is required when enabled
7. Admin opens an active cycle -> `app_notifications` written and evaluation-window emails attempted

### Partial
- Some controllers use raw `DB::table()` updates without a transaction — concurrent submissions to `ratings_*` tables could miscount.
- Full PHPUnit suite is green (`php artisan test`: 33 passing tests / 140 assertions), but ratings/reporting coverage is still thin outside the core submission and auth flows.

### Missing
- No backup/restore strategy documented.
- No error monitoring (Sentry, Bugsnag, Flare).
- No `php artisan health:check` or status endpoint.
- No regression coverage yet for outstanding-awards computation, report exports, or archive/restore flows.

### Recommendation
Shift the next reliability push to backup/restore notes, a lightweight health endpoint, and one more regression test around awards/report exports if time permits.

---

## 6. Security — *are users + data protected?*

**Score: 80%.**

### Done
- Role-based access (`role:superadmin,overalladmin` middleware) on system controls
- Branch-scoped queries everywhere (a Branch admin cannot see another branch's data)
- 2FA via email OTP for admins
- Rate-limited login + password-reset routes
- CSRF tokens (Laravel default)
- Audit log table + service
- Input validation centralized in FormRequest classes
- Foreign-key constraints + soft deletes
- **Passwords migrated MD5 -> bcrypt** via `App\Services\LegacyHash`. New writes use bcrypt; legacy MD5 rows verify on login and silently upgrade to bcrypt. `php artisan auth:rehash` reports remaining legacy rows; `--prune` invalidates them when ready to cut over.

### Partial
- `.env` has `APP_DEBUG=true` — leaks stack traces with secrets if deployed as-is.
- No HTTPS enforcement middleware.

### Missing
- No password complexity rules (min length only).
- No "active sessions" view / force-logout.
- No CSP / XSS hardening headers.

### Recommendation
Set `APP_DEBUG=false` and add a `\Illuminate\Routing\Middleware\TrustProxies`-backed HTTPS redirect for production. Run `php artisan auth:rehash` periodically and `--prune` once active users are confirmed on bcrypt.

---

## 7. Maintainability — *can another dev read and extend the code?*

**Score: 80% — strong.**

### Done
- Laravel 12 + Inertia + React (modern, mainstream stack)
- Controllers grouped by domain (Admin/, Client/, Auth/)
- FormRequest validation classes (centralized rules)
- Service layer for cross-cutting logic (`EvaluationNotifier`, `AppNotifier`, `AuditLogger`)
- Migrations are reversible (`down()` defined)
- Consistent naming conventions
- Clean git history, PRs from multiple contributors

### Partial
- No code-formatting CI (Pint is in deps but not enforced on push).
- Some inline anonymous functions in routes (linter hints).

### Missing
- No README or architecture doc — new contributor opens the repo, does not know where to start.
- No PHPDoc on service methods.
- No CONTRIBUTING.md.

### Recommendation
Document four commands in a `README.md`:
```
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
npm install && npm run dev
```
That alone makes maintainability score "passing".

---

## 8. Portability — *can it be deployed elsewhere easily?*

**Score: 50% — weakest, but easiest to fix.**

### Done
- 12-factor-style config (everything in `.env`)
- DB-agnostic Eloquent (could run on PostgreSQL with minor JSON-extract tweaks)
- No hardcoded paths

### Partial
- Several `RatingsController` queries use MySQL-specific `JSON_UNQUOTE(JSON_EXTRACT(...))` — will not run on SQLite or older MariaDB.

### Missing
- No `Dockerfile` or `docker-compose.yml` — panel will ask "how do you deploy this?"
- No deployment guide for shared hosting / cPanel / VPS.
- No staging environment.
- `composer.json` does not pin a PHP minor version.

### Recommendation
Add a basic `docker-compose.yml` (php-fpm + mysql + nginx) and a `DEPLOY.md` with step-by-step instructions for one target (cPanel or DigitalOcean droplet — whichever HCC actually uses). 2 hours of work.

---

## Top 5 priority fixes before defense

Ranked by **impact divided by effort**.

| # | Fix                                                          | Categories Improved          | Effort   |
|---|--------------------------------------------------------------|------------------------------|----------|
| 1 | ~~Migrate passwords from MD5 -> bcrypt (with on-login rehash)~~ **DONE** | Security                     | shipped  |
| 2 | ~~Write 5 feature tests for evaluation flows~~ **DONE**      | Reliability                  | shipped  |
| 3 | ~~Add missing sidebar nav entries + wire `ConfirmDialog`~~ **DONE** | Functional + Usability       | shipped  |
| 4 | Write README + DEPLOY.md + minimal docker-compose            | Maintainability + Portability| 2 hrs    |
| 5 | Set `APP_DEBUG=false` for demo + configure real SMTP         | Security + Functional        | 30 min   |

**Total: ~8-10 hours of focused work raises the weighted average from 68% -> 85%+** ("pass with merit" band).

---

## Conventions to preserve (rules for new code)

When adding new code, the team and any AI assistant **must follow these established patterns**:

1. **Validation** lives in `app/Http/Requests/` FormRequest classes, not inline `$request->validate()`.
2. **Cross-cutting side-effects** go through service classes — never duplicate notification or audit logic in controllers:
   - `App\Services\AppNotifier` — in-app bell + admin alerts
   - `App\Services\EvaluationNotifier` — email + in-app for cycle changes/reminders
   - `App\Services\AuditLogger` — admin/auth action audit trail
3. **Branch scoping** is enforced via `$this->scopedBranchId()` in `app/Http/Controllers/Controller.php`. Every list query a branch admin can hit must apply this.
4. **Role gating** — superadmin/overalladmin-only routes go inside the `role:superadmin,overalladmin` middleware group in `routes/web.php`.
5. **Soft delete** — never hard-delete domain records. Set `is_deleted = 1` instead. Match the existing migration pattern.
6. **Migrations** must define `down()` and be additive (no renames of legacy tables `student`, `teacher`, `employee`, `admin`, `branch`, etc. — those are the legacy schema we read from).
7. **Frontend pages** live in `resources/js/Pages/` and use `AdminLayout` (admin), `PortalLayout` (student/teacher/employee), or `ClientLayout`. The shared `ConfirmDialog` lives at `resources/js/Components/ConfirmDialog.jsx` (when re-added).
8. **Inertia + React only** — no Vue, no Livewire, no Alpine sprinkled in.
9. **Tailwind only** — no separate stylesheets, no styled-components, no CSS-in-JS libraries.
10. **No new MD5 calls.** All new password hashing must use bcrypt (`Hash::make(...)`).

---

## Anti-patterns to refuse / flag

If a request implies any of these, the AI must stop and ask the user to confirm:

- Adding new MD5 / SHA1 password hashing or encryption.
- Disabling CSRF / removing auth middleware on state-changing routes.
- Hard-deleting from any domain table (`student`, `teacher`, `employee`, `admin`, `branch`, `department`, `program`, `strand`, `subject`, `academic_year`, etc.).
- Using `eval()`, `unserialize()` of user input, or `DB::statement()` interpolated with raw user input.
- Bypassing `EnsureAdminRole`, `student.auth`, `teacher.auth`, or `employee.auth` middleware.
- Skipping `--no-verify` on git commits, force-pushing to `main`, amending merged commits, or any destructive history rewrite.
- Adding a new dependency for something Laravel already provides (e.g. installing Maatwebsite/Excel when `fputcsv` already works for our exports).
- Storing secrets in code or in `.env.example` as real values.

---

## Project metadata

- **Stack:** Laravel 12, Inertia 2, React 18, Tailwind, MySQL
- **PHP:** ^8.2
- **Auth tables:** `users` (Breeze admins), `admin` (legacy admin profile), `student`, `teacher`, `employee`
- **Active branches in repo:** `JaeL` (lead), `mike`, `angelo`, `don`, `ken`, `main`
- **Mail driver:** `MAIL_MAILER=log` in dev — switch to SMTP for the demo
- **Queue:** database driver — run `php artisan queue:listen` during demo
- **Cache:** database driver
- **Tests:** PHPUnit, currently auth-scaffolding + 1 BranchManagementTest

---

## Change log

| Date       | Author           | Change                                                  |
|------------|------------------|---------------------------------------------------------|
| 2026-04-26 | Claude (review)  | Initial report against ISO 25010 — overall 68%          |
| 2026-04-26 | Claude           | Priority #1 shipped: MD5 -> bcrypt with on-login rehash + `auth:rehash` command. Security 65% -> 80%. Overall 68% -> 70%. |
| 2026-04-26 | Claude           | Priority #3 shipped: sidebar nav entries (Audit Logs, Outstanding Awards, Head/Branch Ratings, Employee Archives) + `ConfirmDialog` wired into Export, Print Summary, Recompute Awards, Submit Evaluation (Student/Teacher/Employee), Mark-all-read, Clear notifications. Functional 90% -> 95%, Usability 75% -> 85%. Overall 70% -> 74%. |
| 2026-04-26 | Codex            | Added employee portal evaluation tests, admin login lockout + 2FA tests, fixed `ratings_head` to aggregate department-head evaluations against `employee` records, and confirmed the full PHPUnit suite is green (31 tests / 123 assertions). |
| 2026-04-26 | Codex            | Completed Priority #2: added student subject-evaluation and evaluation-cycle notification tests, wired the missing student submission backend, aligned `ratings_subject` with employee-backed subject teachers, and confirmed the full PHPUnit suite is green (33 tests / 140 assertions). |
