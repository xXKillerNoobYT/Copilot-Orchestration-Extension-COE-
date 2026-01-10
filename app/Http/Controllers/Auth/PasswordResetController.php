<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\PasswordResetRequest;
use App\Http\Requests\Auth\PasswordUpdateRequest;
use App\Models\User;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetController extends Controller
{
    /**
     * Display the password reset request view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    /**
     * Handle a password reset link request.
     */
    public function store(PasswordResetRequest $request)
    {
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Don't reveal if email exists - security best practice
            return back()
                ->with('status', 'If an account exists with that email, a password reset link will be sent.');
        }

        $status = Password::sendResetLink(
            $request->only('email')
        );

        return back()
            ->with('status', trans($status) ?: 'If an account exists with that email, a password reset link will be sent.');
    }

    /**
     * Display the password reset view.
     */
    public function edit(string $token): Response
    {
        return Inertia::render('Auth/ResetPassword', [
            'token' => $token,
        ]);
    }

    /**
     * Handle an incoming new password request.
     */
    public function update(PasswordUpdateRequest $request)
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => bcrypt($password),
                ])->save();
            }
        );

        return $status === Password::PASSWORD_RESET
            ? redirect()->route('login')->with('status', trans($status))
            : back()->withErrors(['email' => [trans($status)]]);
    }
}
