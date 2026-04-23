<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Program extends Model
{
    protected $table = 'program';

    protected $fillable = [
        'department_id', 'code', 'name', 'duration_years', 'is_activated', 'is_deleted',
    ];

    protected $casts = ['is_activated' => 'boolean', 'is_deleted' => 'boolean'];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function assignedChair(): HasOne
    {
        return $this->hasOne(Teacher::class, 'program_id')
            ->where('is_deleted', 0)
            ->where('role', 'like', '%Chair%');
    }

    public function yearLevels(): HasMany
    {
        return $this->hasMany(YearLevel::class);
    }
}
