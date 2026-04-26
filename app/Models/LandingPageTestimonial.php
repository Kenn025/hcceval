<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageTestimonial extends Model
{
    protected $table = 'landing_page_testimonials';

    protected $fillable = [
        'submitted_by_type',
        'submitted_by_id',
        'first_name',
        'last_name',
        'role',
        'profile_photo_path',
        'feedback',
        'status',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'submitted_by_id' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
