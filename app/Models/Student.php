<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    protected $table = 'student';

    protected $fillable = [
        'branch_id', 'department_id', 'program_id',
        'strand_id', 'education_level_id',
        'firstname', 'middlename', 'lastname',
        'email', 'password', 'is_activated', 'is_deleted',
    ];

    protected $hidden = ['password'];

    protected $casts = ['is_activated' => 'boolean', 'is_deleted' => 'boolean'];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

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

    public function yearLevel(): BelongsTo
    {
        return $this->belongsTo(EducationLevel::class, 'education_level_id');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->firstname} {$this->middlename} {$this->lastname}");
    }

    public function getStudentNoAttribute(): string
    {
        return 'STU-' . str_pad((string) $this->id, 4, '0', STR_PAD_LEFT);
    }
}
