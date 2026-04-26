<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageFeature extends Model
{
    protected $table = 'landing_page_features';

    protected $fillable = [
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
