<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\LogoutResponse as LogoutResponseContract;
use Symfony\Component\HttpFoundation\Response;

class LogoutResponse implements LogoutResponseContract
{
    public function toResponse($request): Response
    {
        $redirect = route('login', absolute: false);

        return $request->wantsJson()
            ? new JsonResponse(['redirect' => $redirect])
            : redirect($redirect);
    }
}
