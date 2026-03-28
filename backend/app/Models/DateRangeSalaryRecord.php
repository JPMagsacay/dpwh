<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DateRangeSalaryRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_profile_id',
        'start_date',
        'end_date',
        'working_days',
        'weekend_days',
        'salary',
        'range_key',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'working_days' => 'integer',
        'weekend_days' => 'integer',
        'salary' => 'decimal:2',
    ];

    public function employeeProfile()
    {
        return $this->belongsTo(EmployeeProfile::class);
    }
}
