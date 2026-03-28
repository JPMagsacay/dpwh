<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->string('designation')->nullable()->after('position');
            $table->string('employment_status')->nullable()->after('designation');
            $table->string('station_place_of_assignment')->nullable()->after('employment_status');
            $table->string('branch')->nullable()->after('station_place_of_assignment');
            $table->date('separation_date')->nullable()->after('branch');
            $table->string('separation_cause')->nullable()->after('separation_date');
        });
    }

    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'designation',
                'employment_status',
                'station_place_of_assignment',
                'branch',
                'separation_date',
                'separation_cause',
            ]);
        });
    }
};

