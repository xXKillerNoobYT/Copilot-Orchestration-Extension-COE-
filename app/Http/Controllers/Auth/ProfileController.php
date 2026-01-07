<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile edit view.
     */
    public function edit(): Response
    {
        return Inertia::render('Auth/Profile/Edit', [
            'user' => auth()->user(),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(UpdateProfileRequest $request)
    {
        auth()->user()->update($request->validated());

        return back()->with('status', 'Profile updated successfully.');
    }

    /**
     * Update the user's password.
     */
    public function updatePassword(UpdatePasswordRequest $request)
    {
        auth()->user()->update([
            'password' => Hash::make($request->password),
        ]);

        return back()->with('status', 'Password updated successfully.');
    }

    /**
     * Delete the user's account.
     */
    public function deleteAccount()
    {
        if (auth()->user()->isAdmin()) {
            return back()
                ->withErrors(['account' => 'Admin accounts cannot be deleted. Contact support.']);
        }

        $user = auth()->user();
        auth()->logout();
        
        request()->session()->invalidate();
        request()->session()->regenerateToken();
        
        $user->delete();

        return redirect('/')->with('status', 'Your account has been deleted.');
    }
}
