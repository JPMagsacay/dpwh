<?php

use App\Models\YearlySalaryRecord;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yearly_salary_records', function (Blueprint $table) {
            $table->dropUnique('yearly_salary_emp_year_status_desig_unique');
        });

        DB::table('yearly_salary_records')->whereNull('employment_status_snapshot')->update(['employment_status_snapshot' => '']);

        $dupKeys = DB::table('yearly_salary_records')
            ->select('employee_profile_id', 'year', 'employment_status_snapshot')
            ->groupBy('employee_profile_id', 'year', 'employment_status_snapshot')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($dupKeys as $k) {
            $rows = YearlySalaryRecord::query()
                ->where('employee_profile_id', $k->employee_profile_id)
                ->where('year', $k->year)
                ->where('employment_status_snapshot', $k->employment_status_snapshot)
                ->orderBy('id')
                ->get();

            if ($rows->count() < 2) {
                continue;
            }

            $keep = $rows->first();
            $keep->salary = (float) $rows->sum('salary');
            $keep->designation_snapshot = '';
            $keep->save();

            $deleteIds = $rows->pluck('id')->slice(1)->values()->all();
            if ($deleteIds !== []) {
                YearlySalaryRecord::destroy($deleteIds);
            }
        }

        Schema::table('yearly_salary_records', function (Blueprint $table) {
            $table->unique(
                ['employee_profile_id', 'year', 'employment_status_snapshot'],
                'yearly_salary_emp_year_status_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('yearly_salary_records', function (Blueprint $table) {
            $table->dropUnique('yearly_salary_emp_year_status_unique');
        });

        Schema::table('yearly_salary_records', function (Blueprint $table) {
            $table->unique(
                ['employee_profile_id', 'year', 'employment_status_snapshot', 'designation_snapshot'],
                'yearly_salary_emp_year_status_desig_unique'
            );
        });
    }
};
