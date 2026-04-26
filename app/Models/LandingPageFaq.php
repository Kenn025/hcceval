<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageFaq extends Model
{
    protected $table = 'landing_page_faqs';

    protected $fillable = [
        'question',
        'answer',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
