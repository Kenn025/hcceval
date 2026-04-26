<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageHowItWorksStep extends Model
{
    protected $table = 'landing_page_how_it_works_steps';

    protected $fillable = [
        'step_number',
        'title',
        'subtitle',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}

