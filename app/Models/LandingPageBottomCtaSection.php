<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageBottomCtaSection extends Model
{
    protected $table = 'landing_page_bottom_cta_sections';

    protected $fillable = [
        'title_text',
        'subtitle_text',
        'primary_button_label',
        'primary_button_target',
        'secondary_button_label',
        'secondary_button_target',
    ];
}
