<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\JustifyOjtAbsenceRequest;
use App\Models\OjtAbsence;
use App\Models\Student;
use App\Services\OjtAbsenceSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class InternAbsenceController extends Controller
{
    public function __construct(
        private readonly OjtAbsenceSyncService $ojtAbsenceSyncService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $student = $this->internStudent($request);

        $absences = $this->ojtAbsenceSyncService->absencesPayload($student);

        return response()->json([
            'today_attendance' => $this->ojtAbsenceSyncService->todayAttendancePayload($student),
            'absences' => $absences,
            'pending_justification_count' => collect($absences)
                ->where('needs_justification', true)
                ->count(),
        ]);
    }

    public function justify(
        JustifyOjtAbsenceRequest $request,
        OjtAbsence $absence,
    ): JsonResponse {
        $student = $this->internStudent($request);

        abort_unless($absence->student_id === $student->id, 404);

        if ($absence->isJustified()) {
            throw ValidationException::withMessages([
                'reason' => ['You have already submitted a reason for this absence.'],
            ]);
        }

        $proof = $request->file('proof');
        $proofAttributes = [];

        if ($proof instanceof UploadedFile) {
            $storedPath = $proof->store('ojt-absence-proofs', 'local');
            $proofAttributes = [
                'proof_file_path' => $storedPath,
                'proof_original_filename' => $proof->getClientOriginalName(),
                'proof_file_size' => $proof->getSize(),
                'proof_mime_type' => $proof->getMimeType() ?? 'image/jpeg',
            ];
        }

        $absence->update([
            'status' => OjtAbsence::STATUS_JUSTIFIED,
            'reason' => $request->validated('reason'),
            'justification_submitted_at' => now(),
            ...$proofAttributes,
        ]);

        $absence->refresh();

        return response()->json([
            'message' => 'Absence reason submitted successfully.',
            'absence' => $this->ojtAbsenceSyncService->absencePayload(
                $absence,
                fn (OjtAbsence $photo) => url("/api/intern/absences/{$photo->id}/proof"),
            ),
            'today_attendance' => $this->ojtAbsenceSyncService->todayAttendancePayload($student),
        ]);
    }

    public function showProof(Request $request, OjtAbsence $absence)
    {
        $student = $this->internStudent($request);

        abort_unless($absence->student_id === $student->id, 404);
        abort_unless($absence->proof_file_path !== null, 404);
        abort_unless(Storage::disk('local')->exists($absence->proof_file_path), 404);

        return response()->file(
            Storage::disk('local')->path($absence->proof_file_path),
            [
                'Content-Type' => $absence->proof_mime_type ?? 'image/jpeg',
                'Content-Disposition' => 'inline; filename="'.($absence->proof_original_filename ?? 'proof.jpg').'"',
            ],
        );
    }

    private function internStudent(Request $request): Student
    {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        return Student::query()
            ->with('ojtSchedule')
            ->where('user_id', $user->id)
            ->firstOrFail();
    }
}
