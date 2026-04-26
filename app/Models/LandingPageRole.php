<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageRole extends Model
{
    protected $table = 'landing_page_roles';

    protected $fillable = [
        'title',
        'desc_text',
        'features',
        'progress',
        'icon_type',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'features' => 'array',
        'progress' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
