<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageHowItWorksSection extends Model
{
    protected $table = 'landing_page_how_it_works_sections';

    protected $fillable = [
        'badge_text',
        'title_text',
        'subtitle_text',
    ];
}

