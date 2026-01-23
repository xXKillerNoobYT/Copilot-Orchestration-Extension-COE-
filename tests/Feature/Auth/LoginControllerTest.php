<?php

use PHPUnit\Framework\TestCase;

class LoginControllerTest extends TestCase
{
    public function testValidLogin()
    {
        $response = $this->post('/login', [
            'email' => 'user@example.com',
            'password' => 'correct_password'
        ]);

        $response->assertStatus(200);
        $this->assertAuthenticated();
    }

    public function testInvalidLogin()
    {
        $response = $this->post('/login', [
            'email' => 'user@example.com',
            'password' => 'wrong_password'
        ]);

        $response->assertStatus(401);
        $this->assertGuest();
    }
}