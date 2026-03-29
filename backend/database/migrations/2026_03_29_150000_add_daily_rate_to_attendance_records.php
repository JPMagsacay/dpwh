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
            $table->decimal('daily_rate', 12, 2)->nullable()->after('present');
        });

        $rates = EmployeeProfile::query()->pluck('base_salary', 'id');

        AttendanceRecord::query()->whereNull('daily_rate')->chunkById(200, function ($rows) use ($rates) {
            foreach ($rows as $row) {
                $base = $rates[$row->employee_profile_id] ?? 0;
                $row->daily_rate = $base;
                $row->save();
            }
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropColumn('daily_rate');
        });
    }
};
