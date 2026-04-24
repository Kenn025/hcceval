<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Strand extends Model
{
    protected $table = 'strand';

    protected $fillable = [
        'department_id', 'code', 'name', 'is_activated', 'is_deleted',
    ];

    protected $casts = ['is_activated' => 'boolean', 'is_deleted' => 'boolean'];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function yearLevels(): HasMany
    {
        return $this->hasMany(YearLevel::class);
    }

    public function assignedAdviser(): HasOne
    {
        return $this->hasOne(Teacher::class, 'strand_id')
            ->where('is_deleted', 0);
    }
}
