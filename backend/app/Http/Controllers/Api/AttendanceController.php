<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use App\Models\AttendanceRecord;
use App\Models\EmployeeProfile;
use App\Models\YearlySalaryRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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

        $record = AttendanceRecord::updateOrCreate(
            [
                'employee_profile_id' => $employeeProfile->id,
                'date' => $validated['date'],
            ],
            [
                'present' => $validated['present'],
            ]
        );

        $this->syncYearlySalaryFromAttendance(
            $employeeProfile,
            (int) date('Y', strtotime((string) $validated['date'])),
            (string) $validated['date']
        );

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

        // Pre-scan weekends so we can fail atomically (no partial saves).
        $weekendDates = [];
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            if ($d->isWeekend()) {
                $weekendDates[] = $d->toDateString();
            }
        }

        if (! $includeWeekends && ! empty($weekendDates)) {
            throw ValidationException::withMessages([
                'include_weekends' => [
                    'Weekend dates are not allowed for this range. Enable "Include weekends" to mark Sat/Sun as present.',
                ],
                'weekends' => [
                    'Weekend dates: '.implode(', ', $weekendDates),
                ],
            ]);
        }

        $yearsTouched = [];
        $updatedCount = 0;

        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            $dateStr = $d->toDateString();
            $yearsTouched[$d->year] = true;

            AttendanceRecord::updateOrCreate(
                [
                    'employee_profile_id' => $employeeProfile->id,
                    'date' => $dateStr,
                ],
                [
                    'present' => true,
                ]
            );

            $updatedCount++;
        }

        // Recalculate yearly salary for all affected years for the current status/designation snapshots.
        foreach (array_keys($yearsTouched) as $year) {
            $this->syncYearlySalaryFromAttendance($employeeProfile, (int) $year, $start->toDateString());
        }

        return response()->json([
            'ok' => true,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'days_marked_present' => $updatedCount,
        ]);
    }

    public function destroy(EmployeeProfile $employeeProfile, AttendanceRecord $attendanceRecord): JsonResponse
    {
        if ($attendanceRecord->employee_profile_id !== $employeeProfile->id) {
            abort(404);
        }

        $year = (int) date('Y', strtotime((string) $attendanceRecord->date));
        $attendanceRecord->delete();
        $this->syncYearlySalaryFromAttendance($employeeProfile, $year, (string) $attendanceRecord->date);

        return response()->json([
            'ok' => true,
        ]);
    }

    private function syncYearlySalaryFromAttendance(EmployeeProfile $employeeProfile, int $year, ?string $effectiveDate = null): void
    {
        $statusSnapshot = (string) ($employeeProfile->employment_status ?? '');
        $designationSnapshot = (string) ($employeeProfile->designation ?: $employeeProfile->position ?: '');

        $record = YearlySalaryRecord::query()->firstOrNew([
            'employee_profile_id' => $employeeProfile->id,
            'year' => $year,
            'employment_status_snapshot' => $statusSnapshot,
            'designation_snapshot' => $designationSnapshot,
        ]);

        $segmentStartDate = null;
        if ($record->exists && $record->created_at) {
            $segmentStartDate = $record->created_at->toDateString();
        } elseif ($effectiveDate) {
            $segmentStartDate = $effectiveDate;
        }

        $presentCountQuery = AttendanceRecord::query()
            ->where('employee_profile_id', $employeeProfile->id)
            ->whereYear('date', $year)
            ->where('present', true);

        if ($segmentStartDate) {
            $presentCountQuery->whereDate('date', '>=', $segmentStartDate);
        }

        $presentCount = $presentCountQuery->count();
        $salary = round(((float) $employeeProfile->base_salary) * $presentCount, 2);

        $record->salary = $salary;

        // Keep immutable snapshots once already set.
        $record->designation_snapshot ??= $designationSnapshot;
        $record->employment_status_snapshot ??= $statusSnapshot;
        $record->station_place_of_assignment_snapshot ??= (string) ($employeeProfile->station_place_of_assignment ?: $employeeProfile->address ?: '');
        $record->branch_snapshot ??= (string) ($employeeProfile->branch ?? '');
        $record->separation_date_snapshot ??= $employeeProfile->separation_date;
        $record->separation_cause_snapshot ??= (string) ($employeeProfile->separation_cause ?? '');

        $record->save();
    }
}

