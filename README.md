# HCC Evaluation Platform

HCC Evaluation Platform is a Laravel 12 + Inertia + React system for managing multi-campus evaluations across students, teachers, employees, school heads, and administrators.

## Stack

- PHP 8.2
- Laravel 12
- Inertia 2
- React 18
- Tailwind CSS
- MySQL
- nginx

## What the app includes

- Admin modules for branches, departments, programs, strands, subjects, year levels, students, teachers, employees, questionnaires, assignments, ratings, reports, audit logs, and notifications
- Portal dashboards for students, teachers, and employees
- Evaluation submission flows with rating aggregation
- Outstanding awards computation
- Email and in-app notifications
- Admin 2FA and login throttling

## Local setup

### Requirements

- PHP 8.2+
- Composer 2+
- Node.js 20+
- npm 10+
- MySQL 8+ or MariaDB 10.6+

### 1. Install dependencies

```bash
composer install
npm install
```

Shortcut:

```bash
composer run setup
```

`composer run setup` installs PHP dependencies, creates `.env` if needed, generates an app key, runs migrations, installs npm dependencies, and builds frontend assets.

### 2. Create the environment file

```bash
cp .env.example .env
php artisan key:generate
```

If you are on Windows PowerShell:

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

### 3. Configure the database

Update `.env` with your local MySQL credentials.

Important:

- Local development should use MySQL or MariaDB
- The seeded demo data expects MySQL behavior
- The automated PHPUnit suite uses in-memory SQLite only for tests

### 4. Run migrations and seed demo data

```bash
php artisan migrate --seed
```

### 5. Start the app

Fastest all-in-one option:

```bash
composer run dev
```

This starts:

- Laravel app server
- queue worker
- log tailing
- Vite dev server

If you prefer separate terminals:

```bash
php artisan serve --host=127.0.0.1 --port=8100
php artisan queue:listen --tries=1 --timeout=0
npm run dev
```

Then open:

- App: `http://127.0.0.1:8100`
- Health check: `http://127.0.0.1:8100/up`

## Tests

Run the full test suite:

```bash
php artisan test
```

Current baseline:

- 33 passing tests
- 140 assertions

## Seeded demo accounts

After `php artisan migrate --seed`, these legacy admin accounts are available:

- `superadmin@hcc.com` / `password`
- `overalladmin@hcc.com` / `password`
- `admin_sr@hcc.com` / `password`
- `admin_chcc@hcc.com` / `password`

The first successful login upgrades the seeded legacy MD5 password to bcrypt automatically.

## Useful commands

```bash
php artisan test
php artisan queue:listen --tries=1 --timeout=0
php artisan eval:remind
php artisan eval:outstanding
php artisan auth:rehash
```

## Deployment

This project is documented for a native `nginx + php-fpm + mysql` deployment.

Deployment files:

- [docs/DEPLOY.md](docs/DEPLOY.md)
- [deploy/nginx/hcceval.conf](deploy/nginx/hcceval.conf)
- [deploy/systemd/hcceval-queue.service](deploy/systemd/hcceval-queue.service)
- [deploy/systemd/hcceval-scheduler.service](deploy/systemd/hcceval-scheduler.service)

See [docs/DEPLOY.md](docs/DEPLOY.md) for the full VPS/server deployment checklist.
