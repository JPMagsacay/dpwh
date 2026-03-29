<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Widen text fields for real-world addresses and notes; add indexes used for lookups.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->text('address')->nullable()->change();
            $table->text('separation_cause')->nullable()->change();
            $table->index(['surname', 'given_name'], 'employee_profiles_name_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->dropIndex('employee_profiles_name_lookup_idx');
            $table->string('address')->nullable()->change();
            $table->string('separation_cause')->nullable()->change();
        });
    }
};
