<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('recipient_type', 32);           // admin / student / teacher / employee
            $table->unsignedBigInteger('recipient_id')->nullable();
            $table->string('recipient_email', 150)->nullable();
            $table->string('type', 64);                     // eval.window_opened, eval.reminder, password_reset, 2fa, ...
            $table->string('title', 200);
            $table->text('body');
            $table->string('action_url', 500)->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['recipient_type', 'recipient_id']);
            $table->index('recipient_email');
            $table->index('read_at');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_notifications');
    }
};
