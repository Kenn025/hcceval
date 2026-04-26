<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageFaqSection extends Model
{
    protected $table = 'landing_page_faq_sections';

    protected $fillable = [
        'badge_text',
        'title_text',
    ];
}
