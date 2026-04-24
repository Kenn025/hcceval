<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subject extends Model
{
    protected $table = 'subject';

    protected $fillable = [
        'code', 'name', 'type', 'department_id', 'program_id', 'strand_id',
        'teacher_id', 'is_gened', 'is_activated', 'is_deleted',
    ];

    protected $casts = [
        'teacher_id' => 'array',
        'is_gened' => 'boolean',
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
}
