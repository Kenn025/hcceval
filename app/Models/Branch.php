<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    protected $table = 'branch';

    protected $fillable = [
        'code', 'name', 'highest_department', 'custom_settings',
        'address', 'is_main', 'is_activated', 'is_deleted',
    ];

    protected $casts = ['is_main' => 'boolean', 'is_activated' => 'boolean', 'is_deleted' => 'boolean'];

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }
}
