<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageHomeSection extends Model
{
    protected $table = 'landing_page_home_sections';

    protected $fillable = [
        'badge_text',
        'title_text',
        'title_highlight_text',
        'subtitle_text',
        'primary_cta_label',
        'primary_cta_target',
        'secondary_cta_label',
        'secondary_cta_target',
        'background_video_path',
    ];
}
