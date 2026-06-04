<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\EnrollInternFaceRequest;
use App\Models\Student;
use App\Services\InternTimePunchService;
use App\Support\FaceEmbedding;
use Illuminate\Http\JsonResponse;

class InternFaceController extends Controller
{
    public function __construct(
        private readonly InternTimePunchService $internTimePunchService,
    ) {}

    public function enroll(EnrollInternFaceRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = $this->internStudent($user->id);
        $embedding = FaceEmbedding::normalize($request->validated('embedding'));

        return response()->json(
            $this->internTimePunchService->enrollFace($student, $embedding),
        );
    }

    private function internStudent(int $userId): Student
    {
        return Student::query()
            ->where('user_id', $userId)
            ->firstOrFail();
    }
}
