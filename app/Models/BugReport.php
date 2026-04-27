<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BugReport extends Model
{
    protected $fillable = [
        'reporter_type',
        'reporter_id',
        'reporter_name',
        'subject',
        'description',
        'severity',
        'status',
        'resolved_at',
    ];
}
