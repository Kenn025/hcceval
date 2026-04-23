<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Admin extends Model
{
    use SoftDeletes;

    protected $table = 'admins';

    protected $primaryKey = 'admin_id';

    protected $fillable = [
        'admin_name', 'admin_email', 'admin_password',
        'role', 'branch_id', 'is_deleted',
    ];

    protected $hidden = ['admin_password'];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
