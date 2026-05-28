<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request): Response
    {
        $user = $request->user();
        $user?->loadMissing('role');

        $redirect = match ($user?->role?->name) {
            'super_admin' => route('superadmin.dashboard', absolute: false),
            default => route('dashboard', absolute: false),
        };

        return $request->wantsJson()
            ? new JsonResponse(['two_factor' => false, 'redirect' => $redirect])
            : redirect()->intended($redirect);
    }
}
