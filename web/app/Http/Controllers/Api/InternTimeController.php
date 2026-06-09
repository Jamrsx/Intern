<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\PunchInternTimeRequest;
use App\Models\Student;
use App\Services\InternTimePunchService;
use App\Support\FaceEmbedding;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternTimeController extends Controller
{
    public function __construct(
        private readonly InternTimePunchService $internTimePunchService,
    ) {}

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = $this->internStudent($user->id);

        return response()->json(
            $this->internTimePunchService->status($student),
        );
    }

    public function logs(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = $this->internStudent($user->id);

        return response()->json(
            $this->internTimePunchService->history($student),
        );
    }

    public function punch(PunchInternTimeRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = $this->internStudent($user->id);
        $embedding = FaceEmbedding::normalize($request->validated('embedding'));

        return response()->json(
            $this->internTimePunchService->punch(
                $student,
                (string) $request->validated('action'),
                $embedding,
                $request->validated('device_info'),
                $request->validated('latitude') !== null
                    ? (float) $request->validated('latitude')
                    : null,
                $request->validated('longitude') !== null
                    ? (float) $request->validated('longitude')
                    : null,
                $request->validated('location_accuracy_meters') !== null
                    ? (float) $request->validated('location_accuracy_meters')
                    : null,
            ),
        );
    }

    private function internStudent(int $userId): Student
    {
        return Student::query()
            ->where('user_id', $userId)
            ->firstOrFail();
    }
}
