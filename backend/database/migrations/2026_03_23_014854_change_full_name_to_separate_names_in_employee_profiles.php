<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->string('surname');
            $table->string('given_name');
            $table->string('middle_name')->nullable();
        });

        // Migrate existing full_name data
        \DB::table('employee_profiles')->get()->each(function ($profile) {
            $names = explode(' ', $profile->full_name, 3);
            $surname = $names[0] ?? '';
            $givenName = $names[1] ?? '';
            $middleName = $names[2] ?? null;

            \DB::table('employee_profiles')
                ->where('id', $profile->id)
                ->update([
                    'surname' => $surname,
                    'given_name' => $givenName,
                    'middle_name' => $middleName,
                ]);
        });

        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->dropColumn('full_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->string('full_name')->nullable();
        });

        // Combine separate names back to full_name
        \DB::table('employee_profiles')->get()->each(function ($profile) {
            $fullName = trim($profile->surname . ' ' . $profile->given_name . ' ' . $profile->middle_name);
            
            \DB::table('employee_profiles')
                ->where('id', $profile->id)
                ->update([
                    'full_name' => $fullName,
                ]);
        });

        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->dropColumn(['surname', 'given_name', 'middle_name']);
        });
    }
};
