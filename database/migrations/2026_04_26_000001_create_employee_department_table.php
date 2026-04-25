<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('employee_department')) {
            Schema::create('employee_department', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('branch_id')->nullable();
                $table->string('code', 50)->unique();
                $table->string('name', 150);
                $table->text('description')->nullable();
                $table->boolean('is_activated')->default(true);
                $table->boolean('is_deleted')->default(false);
                $table->timestamps();

                $table->index('branch_id');
                $table->foreign('branch_id')->references('id')->on('branch')->nullOnDelete()->cascadeOnUpdate();
            });
        }

        if (Schema::hasTable('employee') && ! Schema::hasColumn('employee', 'employee_department_id')) {
            Schema::table('employee', function (Blueprint $table) {
                $table->unsignedBigInteger('employee_department_id')->nullable()->after('department_id');
                $table->index('employee_department_id');
                $table->foreign('employee_department_id')->references('id')->on('employee_department')->nullOnDelete()->cascadeOnUpdate();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('employee') && Schema::hasColumn('employee', 'employee_department_id')) {
            Schema::table('employee', function (Blueprint $table) {
                $table->dropForeign(['employee_department_id']);
                $table->dropIndex(['employee_department_id']);
                $table->dropColumn('employee_department_id');
            });
        }

        Schema::dropIfExists('employee_department');
    }
};
