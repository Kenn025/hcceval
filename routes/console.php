<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Every Monday 8am — nudge students who haven't submitted all evaluations yet
Schedule::command('eval:remind')->weeklyOn(1, '08:00');
