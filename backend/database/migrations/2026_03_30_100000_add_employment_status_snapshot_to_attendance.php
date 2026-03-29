<?php

use App\Models\AttendanceRecord;
use App\Models\EmployeeProfile;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->string('employment_status_snapshot')->nullable()->after('daily_rate');
        });

        $statusByProfile = EmployeeProfile::query()->pluck('employment_status', 'id');

        AttendanceRecord::query()->whereNull('employment_status_snapshot')->chunkById(200, function ($rows) use ($statusByProfile) {
            foreach ($rows as $row) {
                $row->employment_status_snapshot = (string) ($statusByProfile[$row->employee_profile_id] ?? '');
                $row->save();
            }
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropColumn('employment_status_snapshot');
        });
    }
};
