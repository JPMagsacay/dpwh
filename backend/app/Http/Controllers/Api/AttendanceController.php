<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use App\Models\AttendanceRecord;
use App\Models\EmployeeProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request, EmployeeProfile $employeeProfile): JsonResponse
    {
        $all = filter_var($request->query('all', false), FILTER_VALIDATE_BOOLEAN);
        $year = (int) $request->query('year', (int) now()->format('Y'));

        $recordsQuery = AttendanceRecord::query()
            ->where('employee_profile_id', $employeeProfile->id)
            ->orderBy('date');

        if (! $all) {
            $recordsQuery->whereYear('date', $year);
        }

        $records = $recordsQuery->get();

        return response()->json([
            'year' => $all ? null : $year,
            'all' => $all,
            'records' => $records,
        ]);
    }

    public function upsert(Request $request, EmployeeProfile $employeeProfile): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'present' => ['required', 'boolean'],
        ]);

        $rate = round((float) $employeeProfile->base_salary, 2);
        $statusSnap = trim((string) ($employeeProfile->employment_status ?? ''));

        $record = AttendanceRecord::query()
            ->where('employee_profile_id', $employeeProfile->id)
            ->whereDate('date', $validated['date'])
            ->first();

        if ($record) {
            $record->present = (bool) $validated['present'];
            if ($record->daily_rate === null) {
                $record->daily_rate = $rate;
            }
            if ($record->employment_status_snapshot === null) {
                $record->employment_status_snapshot = $statusSnap;
            }
            $record->save();
        } else {
            $record = AttendanceRecord::create([
                'employee_profile_id' => $employeeProfile->id,
                'date' => $validated['date'],
                'present' => (bool) $validated['present'],
                'daily_rate' => $rate,
                'employment_status_snapshot' => $statusSnap,
            ]);
        }

        return response()->json([
            'record' => $record,
        ]);
    }

    public function markPresentRange(Request $request, EmployeeProfile $employeeProfile): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['required', 'date', 'before_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date', 'before_or_equal:today'],
            'include_weekends' => ['sometimes', 'boolean'],
        ]);

        $start = Carbon::parse((string) $validated['start_date'])->startOfDay();
        $end = Carbon::parse((string) $validated['end_date'])->startOfDay();

        $includeWeekends = (bool) ($validated['include_weekends'] ?? false);

        // Count working days and weekend days separately
        $workingDaysCount = 0;
        $weekendDaysCount = 0;
        $weekendDates = [];
        
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            if ($d->isWeekend()) {
                $weekendDaysCount++;
                $weekendDates[] = $d->toDateString();
            } else {
                $workingDaysCount++;
            }
        }

        $updatedCount = 0;
        $rate = round((float) $employeeProfile->base_salary, 2);
        $statusSnap = trim((string) ($employeeProfile->employment_status ?? ''));

        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            $dateStr = $d->toDateString();

            // Mark as present only if not weekend, or if weekends are explicitly included
            $shouldMarkPresent = !$d->isWeekend() || $includeWeekends;
            
            if ($shouldMarkPresent) {
                $existing = AttendanceRecord::query()
                    ->where('employee_profile_id', $employeeProfile->id)
                    ->whereDate('date', $dateStr)
                    ->first();

                if ($existing) {
                    $existing->present = true;
                    if ($existing->daily_rate === null) {
                        $existing->daily_rate = $rate;
                    }
                    if ($existing->employment_status_snapshot === null) {
                        $existing->employment_status_snapshot = $statusSnap;
                    }
                    $existing->save();
                } else {
                    AttendanceRecord::create([
                        'employee_profile_id' => $employeeProfile->id,
                        'date' => $dateStr,
                        'present' => true,
                        'daily_rate' => $rate,
                        'employment_status_snapshot' => $statusSnap,
                    ]);
                }
                $updatedCount++;
            }
        }

        $salaryForRange = (float) AttendanceRecord::query()
            ->where('employee_profile_id', $employeeProfile->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->where('present', true)
            ->get()
            ->sum(fn (AttendanceRecord $r) => (float) ($r->daily_rate ?? $rate));

        return response()->json([
            'ok' => true,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'total_days' => $workingDaysCount + $weekendDaysCount,
            'working_days' => $workingDaysCount,
            'weekend_days' => $weekendDaysCount,
            'days_marked_present' => $updatedCount,
            'salary_for_range' => round($salaryForRange, 2),
            'weekend_dates' => $weekendDates,
            'salary_note' => 'This amount is from attendance only. Save it under the Salary tab to store it in yearly records.',
        ]);
    }

    public function destroy(EmployeeProfile $employeeProfile, AttendanceRecord $attendanceRecord): JsonResponse
    {
        if ($attendanceRecord->employee_profile_id !== $employeeProfile->id) {
            abort(404);
        }

        $attendanceRecord->delete();

        return response()->json([
            'ok' => true,
        ]);
    }
}

