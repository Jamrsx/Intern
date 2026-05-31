<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $student = Student::query()
            ->with(['user.role'])
            ->where('student_number', $request->validated('student_number'))
            ->first();

        $user = $student?->user;

        if ($user === null || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'student_number' => ['Invalid student ID or password.'],
            ]);
        }

        if (! $user->is_active || ! $student->is_active) {
            throw ValidationException::withMessages([
                'student_number' => ['Your account is inactive.'],
            ]);
        }

        if (! $user->hasRole('intern')) {
            throw ValidationException::withMessages([
                'student_number' => ['This login is for intern accounts only.'],
            ]);
        }

        $token = $user->createToken('mobile-api');

        return response()->json([
            'token_type' => 'Bearer',
            'access_token' => $token->accessToken,
            'expires_at' => $token->token->expires_at?->toIso8601String(),
            'user' => $user->load('role'),
            'student' => [
                'id' => $student->id,
                'student_number' => $student->student_number,
                'full_name' => $student->fullName(),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();

        if ($token !== null) {
            $token->revoke();
        }

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        $student = Student::query()
            ->where('user_id', $user->id)
            ->first();

        return response()->json([
            'user' => $user,
            'student' => $student ? [
                'id' => $student->id,
                'student_number' => $student->student_number,
                'full_name' => $student->fullName(),
            ] : null,
        ]);
    }
}
