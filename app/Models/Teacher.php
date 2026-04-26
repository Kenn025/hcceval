<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Teacher extends Model
{
    protected $table = 'teacher';

    protected $fillable = [
        'code', 'branch_id', 'department_id', 'program_id', 'strand_id',
        'firstname', 'middlename', 'lastname',
        'email', 'password', 'profile_photo_path', 'role', 'personal_info', 'evaluation_submission_ids', 'assigned_subject_ids', 'is_activated', 'is_deleted',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'personal_info' => 'array',
        'evaluation_submission_ids' => 'array',
        'assigned_subject_ids' => 'array',
        'is_activated' => 'boolean',
        'is_deleted' => 'boolean',
    ];

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

    public function getFullNameAttribute(): string
    {
        return trim("{$this->firstname} {$this->middlename} {$this->lastname}");
    }

    public function getEmployeeNoAttribute(): string
    {
        return $this->code ?: ('TCH-' . str_pad((string) $this->id, 4, '0', STR_PAD_LEFT));
    }

    public function toArray(): array
    {
        $attributes = parent::toArray();

        $attributes['first_name'] = $attributes['firstname'] ?? null;
        $attributes['middle_name'] = $attributes['middlename'] ?? null;
        $attributes['last_name'] = $attributes['lastname'] ?? null;
        $attributes['suffix_name'] = null;
        $attributes['employee_no'] = $attributes['code'] ?? $this->employee_no;
        $attributes['evaluation_submission_ids'] = $attributes['evaluation_submission_ids'] ?? [];
        $attributes['assigned_subject_ids'] = $attributes['assigned_subject_ids'] ?? [];
        $attributes['is_active'] = (bool) ($attributes['is_activated'] ?? false);
        $attributes['status'] = ($attributes['is_activated'] ?? false) ? 'Active' : 'Inactive';

        return $attributes;
    }
}
