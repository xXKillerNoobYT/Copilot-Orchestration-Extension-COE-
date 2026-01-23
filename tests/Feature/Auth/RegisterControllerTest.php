<?php

use Tests\TestCase;

class RegisterControllerTest extends TestCase
{
    public function testUserCanRegisterWithValidData()
    {
        $response = $this->post('/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
        ]);
    }

    public function testUserCannotRegisterWithInvalidEmail()
    {
        $response = $this->post('/register', [
            'name' => 'John Doe',
            'email' => 'invalid-email',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(422);
    }

    public function testUserCannotRegisterWithShortPassword()
    {
        $response = $this->post('/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);

        $response->assertStatus(422);
    }

    public function testUserCannotRegisterWithMismatchedPasswords()
    {
        $response = $this->post('/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password',
            'password_confirmation' => 'differentpassword',
        ]);

        $response->assertStatus(422);
    }
}