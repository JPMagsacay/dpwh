<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\URL;

class EmployeeProfile extends Model
{
    protected $fillable = [
        'surname',
        'given_name', 
        'middle_name',
        'position',
        'designation',
        'employment_status',
        'station_place_of_assignment',
        'branch',
        'separation_date',
        'separation_cause',
        'birth_date',
        'address',
        'base_salary',
        'photo_path',
        'archived_at',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'separation_date' => 'date',
        'base_salary' => 'decimal:2',
        'archived_at' => 'datetime',
    ];

    protected $appends = [
        'photo_url',
        'full_name',
        'full_name_with_middle_name',
    ];

    public function attendanceRecords(): HasMany
    {
        /** @var HasMany<AttendanceRecord, EmployeeProfile> */
        return $this->hasMany(AttendanceRecord::class);
    }

    public function yearlySalaryRecords(): HasMany
    {
        /** @var HasMany<YearlySalaryRecord, EmployeeProfile> */
        return $this->hasMany(YearlySalaryRecord::class);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        if (! $this->photo_path) {
            return null;
        }

        return URL::to('/storage/'.ltrim($this->photo_path, '/'));
    }

    public function getFullNameAttribute(): string
    {
        return trim($this->surname . ' ' . $this->given_name);
    }

    public function getFullNameWithMiddleNameAttribute(): string
    {
        return trim($this->surname . ' ' . $this->given_name . ' ' . $this->middle_name);
    }
}

