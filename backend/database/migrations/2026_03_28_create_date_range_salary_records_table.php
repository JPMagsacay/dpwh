<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('date_range_salary_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_profile_id')->constrained('employee_profiles')->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('working_days');
            $table->integer('weekend_days');
            $table->decimal('salary', 12, 2)->default(0);
            $table->string('range_key')->unique(); // Unique identifier for the range
            $table->timestamps();

            $table->index(['employee_profile_id', 'start_date']);
            $table->index(['employee_profile_id', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('date_range_salary_records');
    }
};
