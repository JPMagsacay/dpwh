<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yearly_salary_records', function (Blueprint $table) {
            // Foreign key requires an index on employee_profile_id; the old unique(emp, year) satisfied that.
            $table->index('employee_profile_id', 'yearly_salary_records_employee_profile_id_index');
        });

        Schema::table('yearly_salary_records', function (Blueprint $table) {
            $table->dropUnique(['employee_profile_id', 'year']);
        });

        DB::table('yearly_salary_records')->whereNull('employment_status_snapshot')->update(['employment_status_snapshot' => '']);
        DB::table('yearly_salary_records')->whereNull('designation_snapshot')->update(['designation_snapshot' => '']);

        Schema::table('yearly_salary_records', function (Blueprint $table) {
            $table->unique(
                ['employee_profile_id', 'year', 'employment_status_snapshot', 'designation_snapshot'],
                'yearly_salary_emp_year_status_desig_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('yearly_salary_records', function (Blueprint $table) {
            $table->dropUnique('yearly_salary_emp_year_status_desig_unique');
        });

        Schema::table('yearly_salary_records', function (Blueprint $table) {
            $table->unique(['employee_profile_id', 'year']);
        });

        Schema::table('yearly_salary_records', function (Blueprint $table) {
            $table->dropIndex('yearly_salary_records_employee_profile_id_index');
        });
    }
};
