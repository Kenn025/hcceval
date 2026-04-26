<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageContactSection extends Model
{
    protected $table = 'landing_page_contact_sections';

    protected $fillable = [
        'badge_text',
        'title_text',
        'subtitle_text',
        'email_label',
        'email_value',
        'location_label',
        'location_value',
        'phone_label',
        'phone_value',
        'form_name_label',
        'form_name_placeholder',
        'form_email_label',
        'form_email_placeholder',
        'form_message_label',
        'form_message_placeholder',
        'form_button_label',
    ];
}
