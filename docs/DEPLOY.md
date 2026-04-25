# Deploy Guide

This guide documents the deployment setup used for the HCC Evaluation Platform:

- Ubuntu 24.04 LTS or similar Linux server
- nginx
- php-fpm
- MySQL or MariaDB
- systemd services for the Laravel queue worker and scheduler

This matches a normal VPS or school-hosted Linux server more closely than a container-based setup.

## 1. Server requirements

- 2 vCPU minimum
- 4 GB RAM recommended
- 20 GB free disk space
- nginx
- PHP 8.2 with `bcmath`, `ctype`, `fileinfo`, `intl`, `json`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`, and `zip`
- Composer 2
- Node.js 20+
- MySQL 8+ or MariaDB 10.6+
- A DNS name or public IP

## 2. Clone the project

```bash
git clone <your-repo-url> /var/www/hcceval
cd /var/www/hcceval
```

## 3. Create the environment file

```bash
cp .env.example .env
```

Update `.env` for production.

Minimum recommended values:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.example

LOG_CHANNEL=stack
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=hcc_multicampus
DB_USERNAME=hcc
DB_PASSWORD=change-this

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-smtp-user
MAIL_PASSWORD=your-smtp-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@your-domain.example
MAIL_FROM_NAME="HCC Evaluation Platform"
```

Notes:

- `APP_DEBUG=false` should stay off in production
- if HTTPS is enabled, keep `APP_URL` on `https://...`

## 4. Install dependencies and frontend assets

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

## 5. Initialize Laravel

```bash
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

If you want a clean demo environment:

```bash
php artisan migrate:fresh --seed --force
```

## 6. Set file permissions

```bash
sudo chown -R www-data:www-data /var/www/hcceval
sudo chmod -R 775 storage bootstrap/cache
```

## 7. Configure php-fpm

Make sure php-fpm is installed and enabled:

```bash
sudo systemctl enable php8.2-fpm
sudo systemctl start php8.2-fpm
```

## 8. Configure nginx

Copy the sample config:

```bash
sudo cp deploy/nginx/hcceval.conf /etc/nginx/sites-available/hcceval
```

Edit these values:

- `server_name`
- `root`
- PHP-FPM socket path if your PHP version differs

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/hcceval /etc/nginx/sites-enabled/hcceval
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Configure background workers

Copy the systemd service files:

```bash
sudo cp deploy/systemd/hcceval-queue.service /etc/systemd/system/
sudo cp deploy/systemd/hcceval-scheduler.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable hcceval-queue hcceval-scheduler
sudo systemctl start hcceval-queue hcceval-scheduler
```

These services run:

- `php artisan queue:work --verbose --tries=1 --timeout=0`
- `php artisan schedule:work`

## 10. HTTPS

If you use Certbot with nginx:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example
```

Then set:

```dotenv
APP_URL=https://your-domain.example
SESSION_SECURE_COOKIE=true
```

## 11. Health and smoke checks

Open the app:

- `http://your-domain.example`

Health endpoint:

- `http://your-domain.example/up`

Recommended checks:

- login works
- admin dashboard loads
- queue service is running
- scheduler service is running
- notifications can be created
- SMTP credentials are valid

## 12. Updates

When you pull new code:

```bash
git pull origin JaeL
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
sudo systemctl reload nginx
sudo systemctl restart php8.2-fpm hcceval-queue hcceval-scheduler
```

## 13. Backups

Minimum backup checklist:

- dump MySQL daily
- keep a copy of `.env`
- keep uploaded files from `storage/app`

Example database backup:

```bash
mysqldump -u root -p hcc_multicampus > backup.sql
```

Restore example:

```bash
mysql -u root -p hcc_multicampus < backup.sql
```

## 14. Troubleshooting

Show logs:

```bash
tail -f storage/logs/laravel.log
sudo journalctl -u nginx -f
sudo journalctl -u php8.2-fpm -f
sudo journalctl -u hcceval-queue -f
sudo journalctl -u hcceval-scheduler -f
```

Clear cached config after `.env` changes:

```bash
php artisan optimize:clear
```

Rebuild frontend assets:

```bash
npm ci
npm run build
```

## 15. Demo-day checklist

- `APP_DEBUG=false`
- real SMTP configured
- `php artisan migrate --force` already applied
- `nginx`, `php-fpm`, `hcceval-queue`, and `hcceval-scheduler` are running
- `/up` responds successfully
- test admin account confirmed before presentation
