<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\EmployeeProfile;
use App\Models\YearlySalaryRecord;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $year = (int) now()->format('Y');

        $profilesCount = EmployeeProfile::count();
        $presentThisYear = AttendanceRecord::query()->whereYear('date', $year)->where('present', true)->count();
        $totalDaysInYear = (int) Carbon::createFromDate($year, 1, 1)->daysInYear;
        $presenceCoverage = $totalDaysInYear > 0
            ? round(($presentThisYear / $totalDaysInYear) * 100, 2)
            : 0.0;

        $salaryByYear = YearlySalaryRecord::query()
            ->select('year', DB::raw('SUM(salary) as total_salary'))
            ->groupBy('year')
            ->orderBy('year')
            ->limit(8)
            ->get();

        return response()->json([
            'year' => $year,
            'cards' => [
                'profiles' => $profilesCount,
                'present_days_year' => $presentThisYear,
                'presence_coverage_year' => $presenceCoverage,
            ],
            'salary_by_year' => $salaryByYear,
        ]);
    }
}

