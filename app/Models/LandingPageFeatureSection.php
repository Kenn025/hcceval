<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageFeatureSection extends Model
{
    protected $table = 'landing_page_feature_sections';

    protected $fillable = [
        'badge_text',
        'title_text',
        'subtitle_text',
    ];
}
