<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EducationLevel extends Model
{
    protected $table = 'education_level';

    protected $fillable = [
        'code', 'department_id', 'program_id', 'year_level', 'section',
        'teacher_id', 'subject_id', 'is_activated', 'is_deleted',
    ];

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    public function yearLevels(): HasMany
    {
        return $this->hasMany(YearLevel::class);
    }
}
