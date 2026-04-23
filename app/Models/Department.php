<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Department extends Model
{
    protected $table = 'department';

    protected $fillable = ['code', 'name', 'branch_id', 'education_level_id', 'is_activated', 'is_deleted'];

    protected $casts = ['is_activated' => 'boolean', 'is_deleted' => 'boolean'];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function educationLevel(): BelongsTo
    {
        return $this->belongsTo(EducationLevel::class, 'education_level_id');
    }

    public function programs(): HasMany
    {
        return $this->hasMany(Program::class);
    }

    public function strands(): HasMany
    {
        return $this->hasMany(Strand::class);
    }

    public function yearLevels(): HasMany
    {
        return $this->hasMany(YearLevel::class);
    }
}
