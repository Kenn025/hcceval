<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageHeader extends Model
{
    protected $table = 'landing_page_headers';

    protected $fillable = [
        'label',
        'target',
        'item_type',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
