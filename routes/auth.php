<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\Auth\ProfileController;
use Illuminate\Support\Facades\Route;

/**
 * Authentication Routes
 *
 * Guest-only routes (not authenticated)
 */
Route::middleware('guest')->group(function () {
    // Registration
    Route::get('register', [RegisterController::class, 'create'])
        ->name('register');
    Route::post('register', [RegisterController::class, 'store']);

    // Login
    Route::get('login', [LoginController::class, 'create'])
        ->name('login');
    Route::post('login', [LoginController::class, 'store'])
        ->name('login.store');

    // Password Reset
    Route::get('forgot-password', [PasswordResetController::class, 'create'])
        ->name('password.request');
    Route::post('forgot-password', [PasswordResetController::class, 'store'])
        ->name('password.email');

    Route::get('reset-password/{token}', [PasswordResetController::class, 'edit'])
        ->name('password.reset');
    Route::post('reset-password', [PasswordResetController::class, 'update'])
        ->name('password.update');
});

/**
 * Authenticated routes (requires login)
 */
Route::middleware('auth')->group(function () {
    // Email Verification
    Route::get('email/verify', [VerifyEmailController::class, 'notice'])
        ->name('verification.notice');

    Route::get('email/verify/{id}/{hash}', [VerifyEmailController::class, 'verify'])
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [VerifyEmailController::class, 'send'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    // Profile
    Route::get('profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');
    Route::patch('profile', [ProfileController::class, 'update'])
        ->name('profile.update');
    Route::patch('profile/password', [ProfileController::class, 'updatePassword'])
        ->name('profile.password');
    Route::delete('profile', [ProfileController::class, 'deleteAccount'])
        ->name('profile.destroy');

    // Logout
    Route::post('logout', [LoginController::class, 'destroy'])
        ->name('logout');
});

/**
 * Email-verified routes (requires email verification)
 */
Route::middleware(['auth', 'verified'])->group(function () {
    // Add protected routes here that require verified email
});

