<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\EmployeeProfile;
use App\Models\YearlySalaryRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class YearlySalaryController extends Controller
{
    public function index(EmployeeProfile $employeeProfile): JsonResponse
    {
        $records = YearlySalaryRecord::query()
            ->where('employee_profile_id', $employeeProfile->id)
            ->orderByDesc('year')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'records' => $records,
        ]);
    }

    public function upsert(Request $request, EmployeeProfile $employeeProfile): JsonResponse
    {
        $validated = $request->validate([
            'year' => ['required', 'integer', 'min:1900', 'max:2200'],
            'salary' => ['required', 'numeric', 'min:0'],
        ]);
        $year = (int) $validated['year'];
        $salary = (float) $validated['salary'];
        $statusSnapshot = (string) ($employeeProfile->employment_status ?? '');
        $designationSnapshot = (string) ($employeeProfile->designation ?: $employeeProfile->position ?: '');

        $attendanceRecords = AttendanceRecord::query()
            ->where('employee_profile_id', $employeeProfile->id)
            ->whereYear('date', $year)
            ->orderBy('date')
            ->get(['present', 'date']);

        $latestSameRecord = YearlySalaryRecord::query()
            ->where('employee_profile_id', $employeeProfile->id)
            ->where('year', $year)
            ->where('employment_status_snapshot', $statusSnapshot)
            ->where('designation_snapshot', $designationSnapshot)
            ->orderByDesc('id')
            ->first();

        if ($attendanceRecords->isNotEmpty() && $latestSameRecord && $latestSameRecord->created_at) {
            $segmentStart = $latestSameRecord->created_at->toDateString();
            $presentCount = $attendanceRecords
                ->filter(fn ($r) => (bool) $r->present && (string) $r->date >= $segmentStart)
                ->count();
            $minSalary = round(((float) $employeeProfile->base_salary) * $presentCount, 2);

            if ($salary < $minSalary) {
                throw ValidationException::withMessages([
                    'salary' => ["Salary cannot be lower than attendance-based total ({$minSalary}) for {$year} with status {$statusSnapshot}."],
                ]);
            }
        }

        // Same year + same status + same designation => add salary to same record.
        // Different status/designation => create another record.
        $record = $latestSameRecord ?: new YearlySalaryRecord();
        $record->employee_profile_id = $employeeProfile->id;
        $record->year = $year;
        $record->salary = (float) ($record->salary ?? 0) + $salary;

        // Immutable detail snapshot per saved yearly record.
        $record->designation_snapshot ??= $designationSnapshot;
        $record->employment_status_snapshot ??= $statusSnapshot;
        $record->station_place_of_assignment_snapshot ??= (string) ($employeeProfile->station_place_of_assignment ?: $employeeProfile->address ?: '');
        $record->branch_snapshot ??= (string) ($employeeProfile->branch ?? '');
        $record->separation_date_snapshot ??= $employeeProfile->separation_date;
        $record->separation_cause_snapshot ??= (string) ($employeeProfile->separation_cause ?? '');

        $record->save();

        return response()->json([
            'record' => $record,
        ]);
    }

    public function destroy(EmployeeProfile $employeeProfile, YearlySalaryRecord $yearlySalaryRecord): JsonResponse
    {
        if ($yearlySalaryRecord->employee_profile_id !== $employeeProfile->id) {
            abort(404);
        }

        $yearlySalaryRecord->delete();

        return response()->json([
            'ok' => true,
        ]);
    }
}

