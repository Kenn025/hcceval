<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageStat extends Model
{
    protected $table = 'landing_page_stats';

    protected $fillable = [
        'stat_key',
        'label',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
