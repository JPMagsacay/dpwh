<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yearly_salary_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_profile_id')->constrained('employee_profiles')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->decimal('salary', 12, 2)->default(0);
            $table->timestamps();

            $table->unique(['employee_profile_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yearly_salary_records');
    }
};

