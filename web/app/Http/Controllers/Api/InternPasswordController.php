<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\UpdatePasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class InternPasswordController extends Controller
{
    public function update(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $user->forceFill([
            'password' => Hash::make($request->validated('password')),
        ])->save();

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }
}
