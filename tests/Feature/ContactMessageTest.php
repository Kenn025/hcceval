<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactMessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_form_submission_is_shown_in_super_admin_contact_inbox(): void
    {
        $this->post(route('contact-us.store'), [
            'name' => 'Casey Visitor',
            'email' => 'casey.visitor@example.com',
            'message' => 'Please tell me more about the evaluation system.',
        ])->assertRedirect();

        $this->assertDatabaseHas('contact_messages', [
            'name' => 'Casey Visitor',
            'email' => 'casey.visitor@example.com',
            'message' => 'Please tell me more about the evaluation system.',
            'status' => 'new',
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession([
                'admin_role' => 'superadmin',
                'admin_branch_id' => null,
            ])
            ->get(route('admin.contact-us'))
            ->assertOk()
            ->assertSee('Casey Visitor')
            ->assertSee('casey.visitor@example.com')
            ->assertSee('Please tell me more about the evaluation system.');
    }

    public function test_contact_form_rejects_invalid_email_addresses(): void
    {
        $this->post(route('contact-us.store'), [
            'name' => 'Casey Visitor',
            'email' => 'not-an-email',
            'message' => 'Please tell me more about the evaluation system.',
        ])->assertSessionHasErrors('email');

        $this->assertDatabaseMissing('contact_messages', [
            'email' => 'not-an-email',
        ]);
    }
}
