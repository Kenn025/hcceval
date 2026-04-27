<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageFooterSection extends Model
{
    protected $table = 'landing_page_footer_sections';

    protected $fillable = [
        'logo_icon',
        'logo_path',
        'title_text',
        'subtitle_text',
        'quick_links_heading',
        'link_1_label',
        'link_1_target',
        'link_2_label',
        'link_2_target',
        'link_3_label',
        'link_3_target',
        'link_4_label',
        'link_4_target',
        'contact_heading',
        'contact_line_1',
        'contact_line_2',
        'contact_line_3',
        'social_1_label',
        'social_1_link',
        'social_2_label',
        'social_2_link',
        'social_3_label',
        'social_3_link',
        'copyright_suffix_text',
    ];
}
