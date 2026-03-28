<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class YearlySalaryRecord extends Model
{
    protected $fillable = [
        'employee_profile_id',
        'year',
        'salary',
    ];

    protected $casts = [
        'year' => 'integer',
        'salary' => 'decimal:2',
    ];

    public function employeeProfile(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class);
    }
}

