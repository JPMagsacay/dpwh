<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    protected $fillable = [
        'employee_profile_id',
        'date',
        'present',
        'daily_rate',
        'employment_status_snapshot',
    ];

    protected $casts = [
        'date' => 'date',
        'present' => 'boolean',
        'daily_rate' => 'decimal:2',
    ];

    public function employeeProfile(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class);
    }
}

