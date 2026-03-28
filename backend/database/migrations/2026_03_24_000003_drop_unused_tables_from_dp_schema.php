<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('service_records');
        Schema::dropIfExists('projects');
    }

    public function down(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });

        Schema::create('service_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_profile_id')->constrained('employee_profiles')->cascadeOnDelete();
            $table->date('from')->nullable();
            $table->date('to')->nullable();
            $table->string('designation')->nullable();
            $table->string('status')->nullable();
            $table->decimal('salary', 12, 2)->nullable();
            $table->string('office')->nullable();
            $table->string('branch')->nullable();
            $table->string('leave')->nullable();
            $table->date('sep_date')->nullable();
            $table->string('sep_cause')->nullable();
            $table->timestamps();
        });
    }
};

