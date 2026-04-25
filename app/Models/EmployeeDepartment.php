<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeDepartment extends Model
{
    protected $table = 'employee_department';

    protected $fillable = [
        'branch_id',
        'code',
        'name',
        'description',
        'is_activated',
        'is_deleted',
    ];

    protected $casts = [
        'is_activated' => 'boolean',
        'is_deleted' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
