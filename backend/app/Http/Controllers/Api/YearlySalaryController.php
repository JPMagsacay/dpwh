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
            ->orderBy('employment_status_snapshot')
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
            'employment_status' => ['nullable', 'string', 'max:255'],
        ]);
        $year = (int) $validated['year'];
        $salary = (float) $validated['salary'];

        $statusSnapshot = trim((string) ($validated['employment_status'] ?? ''));
        if ($statusSnapshot === '') {
            $statusSnapshot = trim((string) ($employeeProfile->employment_status ?? ''));
        }

        $latestSameRecord = YearlySalaryRecord::query()
            ->where('employee_profile_id', $employeeProfile->id)
            ->where('year', $year)
            ->where('employment_status_snapshot', $statusSnapshot)
            ->orderByDesc('id')
            ->first();

        $minSalary = $this->attendanceMinimumForYear($employeeProfile, $year, $statusSnapshot);

        // Only apply minimum salary validation for permanent employees
        if (strtolower(trim($statusSnapshot)) === 'permanent' && $salary < $minSalary) {
            throw ValidationException::withMessages([
                'salary' => [
                    "Salary cannot be less than the attendance-based amount ({$minSalary}). You may enter a higher amount.",
                ],
            ]);
        }

        $record = $latestSameRecord ?? new YearlySalaryRecord;
        $record->employee_profile_id = $employeeProfile->id;
        $record->year = $year;
        $record->salary = $salary;
        $record->employment_status_snapshot = $statusSnapshot;
        $record->designation_snapshot = '';

        if (! $latestSameRecord) {
            $record->station_place_of_assignment_snapshot = (string) ($employeeProfile->station_place_of_assignment ?: $employeeProfile->address ?: '');
            $record->branch_snapshot = (string) ($employeeProfile->branch ?? '');
            $record->separation_date_snapshot = $employeeProfile->separation_date;
            $record->separation_cause_snapshot = (string) ($employeeProfile->separation_cause ?? '');
        }

        $record->save();

        return response()->json([
            'record' => $record,
        ]);
    }

    /** Sum of per-day rates stored on attendance (locked when each day was saved). */
    private function attendanceMinimumForYear(EmployeeProfile $employeeProfile, int $year, string $employmentStatusSnapshot): float
    {
        $base = (float) $employeeProfile->base_salary;

        $query = AttendanceRecord::query()
            ->where('employee_profile_id', $employeeProfile->id)
            ->whereYear('date', $year)
            ->where('present', true);

        if ($employmentStatusSnapshot !== '') {
            $query->where('employment_status_snapshot', $employmentStatusSnapshot);
        } else {
            $query->where(function ($q) {
                $q->whereNull('employment_status_snapshot')->orWhere('employment_status_snapshot', '');
            });
        }

        $rows = $query->get(['daily_rate']);

        $sum = $rows->sum(fn (AttendanceRecord $r) => (float) ($r->daily_rate ?? $base));

        return round($sum, 2);
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
