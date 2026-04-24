<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Admin extends Model
{
    protected $table = 'admin';

    protected $fillable = [
        'code', 'name', 'email', 'password',
        'role', 'branch_id', 'is_activated', 'is_deleted',
    ];

    protected $hidden = ['password'];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
