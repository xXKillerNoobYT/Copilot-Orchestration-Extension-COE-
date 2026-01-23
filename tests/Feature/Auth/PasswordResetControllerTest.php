<?php

use PHPUnit\Framework\TestCase;

class PasswordResetControllerTest extends TestCase
{
    public function testPasswordResetRequest()
    {
        // Simulate a password reset request and assert the response
        $response = $this->post('/password/reset', ['email' => 'user@example.com']);
        $this->assertEquals(200, $response->getStatusCode());
        $this->assertContains('Password reset link sent', (string) $response->getBody());
    }

    public function testPasswordUpdate()
    {
        // Simulate a password update and assert the response
        $response = $this->post('/password/update', [
            'token' => 'valid-token',
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword'
        ]);
        $this->assertEquals(200, $response->getStatusCode());
        $this->assertContains('Password updated successfully', (string) $response->getBody());
    }
}