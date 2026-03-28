<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EmployeeProfileController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $archived = filter_var($request->query('archived', false), FILTER_VALIDATE_BOOLEAN);

        $profiles = EmployeeProfile::query()
            ->when($archived, fn ($query) => $query->whereNotNull('archived_at'))
            ->when(! $archived, fn ($query) => $query->whereNull('archived_at'))
            ->when($q !== '', fn ($query) => $query->whereRaw("CONCAT_WS(' ', surname, given_name, middle_name) like ?", ["%{$q}%"]))
            ->orderBy('surname')
            ->orderBy('given_name')
            ->paginate(20);

        return response()->json($profiles);
    }

    public function show(EmployeeProfile $employeeProfile): JsonResponse
    {
        $employeeProfile->load([
            'yearlySalaryRecords' => fn ($q) => $q->orderByDesc('year')->orderByDesc('id'),
        ]);

        return response()->json([
            'profile' => $employeeProfile,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'surname' => ['required', 'string', 'max:255'],
            'given_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'designation' => ['nullable', 'string', 'max:255'],
            'employment_status' => ['nullable', 'string', 'max:255'],
            'station_place_of_assignment' => ['nullable', 'string', 'max:255'],
            'branch' => ['nullable', 'string', 'max:255'],
            'separation_date' => ['nullable', 'date'],
            'separation_cause' => ['nullable', 'string', 'max:255'],
            'birth_date' => ['nullable', 'date'],
            'address' => ['nullable', 'string', 'max:255'],
            'base_salary' => ['required', 'numeric', 'min:0'],
            'photo' => ['nullable', 'image', 'max:4096'],
        ]);

        $profile = new EmployeeProfile($validated);

        if ($request->hasFile('photo')) {
            $profile->photo_path = $request->file('photo')->store('profile_photos', 'public');
        }

        $profile->save();

        return response()->json([
            'profile' => $profile,
        ], 201);
    }

    public function update(Request $request, EmployeeProfile $employeeProfile): JsonResponse
    {
        $validated = $request->validate([
            'surname' => ['sometimes', 'required', 'string', 'max:255'],
            'given_name' => ['sometimes', 'required', 'string', 'max:255'],
            'middle_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'position' => ['sometimes', 'nullable', 'string', 'max:255'],
            'designation' => ['sometimes', 'nullable', 'string', 'max:255'],
            'employment_status' => ['sometimes', 'nullable', 'string', 'max:255'],
            'station_place_of_assignment' => ['sometimes', 'nullable', 'string', 'max:255'],
            'branch' => ['sometimes', 'nullable', 'string', 'max:255'],
            'separation_date' => ['sometimes', 'nullable', 'date'],
            'separation_cause' => ['sometimes', 'nullable', 'string', 'max:255'],
            'birth_date' => ['sometimes', 'nullable', 'date'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'base_salary' => ['sometimes', 'required', 'numeric', 'min:0'],
            'photo' => ['sometimes', 'nullable', 'image', 'max:4096'],
            'remove_photo' => ['sometimes', 'boolean'],
        ]);

        $employeeProfile->fill($validated);

        // Remove photo if requested
        if (($validated['remove_photo'] ?? false) === true) {
            if ($employeeProfile->photo_path) {
                Storage::disk('public')->delete($employeeProfile->photo_path);
            }
            $employeeProfile->photo_path = null;
        }

        // Upload new photo if provided
        if ($request->hasFile('photo')) {
            if ($employeeProfile->photo_path) {
                Storage::disk('public')->delete($employeeProfile->photo_path);
            }
            $employeeProfile->photo_path = $request->file('photo')->store('profile_photos', 'public');
        }

        $employeeProfile->save();

        return response()->json([
            'profile' => $employeeProfile,
        ]);
    }

    public function destroy(EmployeeProfile $employeeProfile): JsonResponse
    {
        if ($employeeProfile->photo_path) {
            Storage::disk('public')->delete($employeeProfile->photo_path);
        }

        $employeeProfile->delete();

        return response()->json([
            'ok' => true,
        ]);
    }

    public function archive(EmployeeProfile $employeeProfile): JsonResponse
    {
        $employeeProfile->setAttribute('archived_at', now());
        $employeeProfile->save();

        return response()->json([
            'ok' => true,
            'profile' => $employeeProfile,
        ]);
    }
}