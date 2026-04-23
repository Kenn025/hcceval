<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ClientLoginController extends Controller
{
    public function showLogin(): RedirectResponse
    {
        return redirect()->route('login');
    }

    public function logout(Request $request): RedirectResponse
    {
        $request->session()->forget(['client_type', 'client_id', 'client_name', 'client_branch', 'client_role']);

        return redirect()->route('login');
    }
}
