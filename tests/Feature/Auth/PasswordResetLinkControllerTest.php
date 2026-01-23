<?php

use Tests\TestCase;

class PasswordResetLinkControllerTest extends TestCase
{
    public function testGeneratePasswordResetLink()
    {
        // Simulate user request for password reset link
        $response = $this->post('/password/reset', ['email' => 'user@example.com']);
        $response->assertStatus(200);
        $this->assertDatabaseHas('password_resets', ['email' => 'user@example.com']);
    }

    public function testValidatePasswordResetLink()
    {
        // Simulate a valid password reset link
        $token = 'valid-token';
        $response = $this->get("/password/reset/{$token}");
        $response->assertStatus(200);
    }

    public function testInvalidPasswordResetLink()
    {
        // Simulate an invalid password reset link
        $token = 'invalid-token';
        $response = $this->get("/password/reset/{$token}");
        $response->assertStatus(404);
    }
}