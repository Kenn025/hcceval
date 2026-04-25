<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EducationLevel extends Model
{
    protected $table = 'education_level';

    protected $fillable = [
        'code', 'department_id', 'program_id', 'strand_id', 'year_level', 'section',
        'teacher_id', 'subject_id', 'subject_teacher_map', 'is_activated', 'is_deleted',
    ];

    protected $casts = [
        'teacher_id' => 'array',
        'subject_id' => 'array',
        'subject_teacher_map' => 'array',
        'is_activated' => 'boolean',
        'is_deleted' => 'boolean',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function strand(): BelongsTo
    {
        return $this->belongsTo(Strand::class);
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    public function yearLevels(): HasMany
    {
        return $this->hasMany(YearLevel::class);
    }
}
