<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Subject extends Model
{
    use SoftDeletes;

    protected $table = 'subjects';

    protected $fillable = [
        'year_level_id', 'department_id', 'term_type', 'term',
        'education_level', 'grade_level', 'academic_track', 'academic_strand',
        'code', 'name', 'description', 'units', 'is_active',
    ];

    protected $casts = ['is_active' => 'boolean', 'units' => 'float'];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function yearLevel(): BelongsTo
    {
        return $this->belongsTo(YearLevel::class);
    }
}
