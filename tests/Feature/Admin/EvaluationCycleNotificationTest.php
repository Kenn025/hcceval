<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Notifications\EvaluationWindowOpened;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EvaluationCycleNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_opening_an_active_cycle_writes_app_notifications_and_attempts_emails(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        DB::table('admin')->insert([
            'code' => 'ADM-NTF-001',
            'name' => 'Overall Admin',
            'role' => 'overalladmin',
            'branch_id' => 1,
            'email' => 'admin.notifications@hcc.local',
            'password' => bcrypt('secret123'),
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('student')->insert([
            'code' => 'STU-NTF-001',
            'firstname' => 'Nina',
            'lastname' => 'Student',
            'email' => 'student.notifications@hcc.local',
            'password' => bcrypt('secret123'),
            'branch_id' => 1,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('teacher')->insert([
            'code' => 'TCH-NTF-001',
            'firstname' => 'Tom',
            'lastname' => 'Teacher',
            'email' => 'teacher.notifications@hcc.local',
            'password' => bcrypt('secret123'),
            'branch_id' => 1,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('employee')->insert([
            'code' => 'EMP-NTF-001',
            'firstname' => 'Eli',
            'lastname' => 'Employee',
            'email' => 'employee.notifications@hcc.local',
            'password' => bcrypt('secret123'),
            'branch_id' => 1,
            'is_activated' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this
            ->actingAs($user)
            ->withSession([
                'admin_role' => 'overalladmin',
                'admin_branch_id' => 1,
            ])
            ->post(route('admin.evaluation-cycle'), [
                'year_start' => 2026,
                'year_end' => 2027,
                'semester' => '1st Sem',
                'status' => 'active',
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('academic_year', [
            'from_year' => 2026,
            'to_year' => 2027,
            'term' => '1st Sem',
            'is_activated' => 1,
            'is_deleted' => 0,
        ]);

        $this->assertDatabaseCount('app_notifications', 4);
        $this->assertDatabaseHas('app_notifications', [
            'recipient_type' => 'student',
            'recipient_email' => 'student.notifications@hcc.local',
            'type' => 'eval.window_opened',
        ]);
        $this->assertDatabaseHas('app_notifications', [
            'recipient_type' => 'teacher',
            'recipient_email' => 'teacher.notifications@hcc.local',
            'type' => 'eval.window_opened',
        ]);
        $this->assertDatabaseHas('app_notifications', [
            'recipient_type' => 'employee',
            'recipient_email' => 'employee.notifications@hcc.local',
            'type' => 'eval.window_opened',
        ]);
        $this->assertDatabaseHas('app_notifications', [
            'recipient_type' => 'admin',
            'recipient_email' => 'admin.notifications@hcc.local',
            'type' => 'eval.window_opened',
        ]);

        Notification::assertSentOnDemandTimes(EvaluationWindowOpened::class, 3);
        Notification::assertSentOnDemand(EvaluationWindowOpened::class, function (EvaluationWindowOpened $notification, array $channels, object $notifiable): bool {
            return in_array('mail', $channels, true)
                && ($notifiable->routes['mail'] ?? null) === 'student.notifications@hcc.local';
        });
        Notification::assertSentOnDemand(EvaluationWindowOpened::class, function (EvaluationWindowOpened $notification, array $channels, object $notifiable): bool {
            return in_array('mail', $channels, true)
                && ($notifiable->routes['mail'] ?? null) === 'teacher.notifications@hcc.local';
        });
        Notification::assertSentOnDemand(EvaluationWindowOpened::class, function (EvaluationWindowOpened $notification, array $channels, object $notifiable): bool {
            return in_array('mail', $channels, true)
                && ($notifiable->routes['mail'] ?? null) === 'employee.notifications@hcc.local';
        });
    }
}
