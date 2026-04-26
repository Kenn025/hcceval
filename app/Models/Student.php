<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Student extends Model
{
    protected $table = 'student';

    protected $fillable = [
        'code', 'branch_id', 'department_id', 'program_id',
        'strand_id', 'education_level_id', 'subject_id', 'removed_subject_map',
        'is_irreg', 'irreg_subject_id', 'irreg_subject_map', 'evaluation_submission_ids',
        'firstname', 'middlename', 'lastname',
        'email', 'password', 'profile_photo_path', 'is_activated', 'is_deleted',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'subject_id' => 'array',
        'removed_subject_map' => 'array',
        'irreg_subject_map' => 'array',
        'evaluation_submission_ids' => 'array',
        'is_irreg' => 'boolean',
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

    public function yearLevel(): BelongsTo
    {
        return $this->belongsTo(EducationLevel::class, 'education_level_id');
    }

    public function irregSubject(): BelongsTo
    {
        return $this->belongsTo(Subject::class, 'irreg_subject_id');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->firstname} {$this->middlename} {$this->lastname}");
    }

    public function getStudentNoAttribute(): string
    {
        return $this->code ?: ('STU-' . str_pad((string) $this->id, 4, '0', STR_PAD_LEFT));
    }

    public function toArray(): array
    {
        $attributes = parent::toArray();

        $attributes['student_no'] = $attributes['code'] ?? $this->student_no;
        $attributes['first_name'] = $attributes['firstname'] ?? null;
        $attributes['middle_name'] = $attributes['middlename'] ?? null;
        $attributes['last_name'] = $attributes['lastname'] ?? null;
        $attributes['suffix_name'] = null;
        $attributes['year_level_id'] = $attributes['education_level_id'] ?? null;
        $attributes['subject_id'] = $attributes['subject_id'] ?? [];
        $attributes['removed_subject_map'] = $attributes['removed_subject_map'] ?? [];
        $attributes['is_irreg'] = (bool) ($attributes['is_irreg'] ?? false);
        $attributes['irreg_subject_id'] = $attributes['irreg_subject_id'] ?? null;
        $attributes['irreg_subject_map'] = $attributes['irreg_subject_map'] ?? [];
        $attributes['evaluation_submission_ids'] = $attributes['evaluation_submission_ids'] ?? [];
        $attributes['is_active'] = (bool) ($attributes['is_activated'] ?? false);
        $attributes['status'] = ($attributes['is_activated'] ?? false) ? 'Active' : 'Inactive';

        return $attributes;
    }
}
