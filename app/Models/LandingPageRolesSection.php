<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageRolesSection extends Model
{
    protected $table = 'landing_page_roles_section';

    protected $fillable = [
        'badge_text',
        'title_text',
        'subtitle_text',
    ];
}
