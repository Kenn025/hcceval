<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageTestimonialSection extends Model
{
    protected $table = 'landing_page_testimonial_sections';

    protected $fillable = [
        'badge_text',
        'title_text',
    ];
}
