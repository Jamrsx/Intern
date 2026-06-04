<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Coordinator\Concerns\ResolvesCoordinatorCourse;
use App\Http\Requests\Coordinator\StoreDocumentRequirementRequest;
use App\Http\Requests\Coordinator\UpdateDocumentRequirementRequest;
use App\Models\DocumentRequirement;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DocumentRequirementController extends Controller
{
    use ResolvesCoordinatorCourse;

    public function index(Request $request): Response
    {
        $section = $this->coordinatorSectionOrFail($request);

        $requirements = DocumentRequirement::query()
            ->where('section_id', $section->id)
            ->withCount([
                'submissions as submitted_count',
            ])
            ->orderBy('deadline_at')
            ->get()
            ->map(fn (DocumentRequirement $requirement) => $this->requirementPayload(
                $requirement,
                $section,
            ))
            ->values()
            ->all();

        return Inertia::render('coordinator/document-requirements', [
            'section' => $this->sectionPayload($section),
            'requirements' => $requirements,
            'student_count' => Student::query()
                ->where('section_id', $section->id)
                ->where('is_active', true)
                ->count(),
        ]);
    }

    public function store(StoreDocumentRequirementRequest $request): RedirectResponse
    {
        $section = $this->coordinatorSectionOrFail($request);
        $validated = $request->validated();

        DocumentRequirement::query()->create([
            'section_id' => $section->id,
            'created_by_user_id' => $request->user()->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'deadline_at' => $validated['deadline_at'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Document requirement created. Interns will see it in the mobile app.',
        ]);

        return redirect()->route('coordinators.document-requirements.index');
    }

    public function update(
        UpdateDocumentRequirementRequest $request,
        DocumentRequirement $documentRequirement,
    ): RedirectResponse {
        $section = $this->coordinatorSectionOrFail($request);
        $this->ensureRequirementBelongsToSection($documentRequirement, $section);

        $validated = $request->validated();

        $documentRequirement->update([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'deadline_at' => $validated['deadline_at'],
            'is_active' => $request->boolean('is_active', $documentRequirement->is_active),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Document requirement updated.',
        ]);

        return redirect()->route('coordinators.document-requirements.index');
    }

    public function destroy(
        Request $request,
        DocumentRequirement $documentRequirement,
    ): RedirectResponse {
        $section = $this->coordinatorSectionOrFail($request);
        $this->ensureRequirementBelongsToSection($documentRequirement, $section);

        $documentRequirement->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Document requirement removed.',
        ]);

        return redirect()->route('coordinators.document-requirements.index');
    }

    private function ensureRequirementBelongsToSection(
        DocumentRequirement $requirement,
        Section $section,
    ): void {
        abort_unless($requirement->section_id === $section->id, 404);
    }

    /**
     * @return array<string, mixed>
     */
    private function sectionPayload(Section $section): array
    {
        $section->loadMissing('course:id,code,name', 'schoolYear:id,name');

        return [
            'id' => $section->id,
            'display_name' => trim(
                ($section->course?->code ?? '').' '.$section->name
            ),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function requirementPayload(
        DocumentRequirement $requirement,
        Section $section,
    ): array {
        $studentCount = Student::query()
            ->where('section_id', $section->id)
            ->where('is_active', true)
            ->count();

        $submittedCount = (int) $requirement->submitted_count;

        return [
            'id' => $requirement->id,
            'title' => $requirement->title,
            'description' => $requirement->description,
            'deadline_at' => $requirement->deadline_at->toIso8601String(),
            'is_active' => $requirement->is_active,
            'submitted_count' => $submittedCount,
            'pending_count' => max(0, $studentCount - $submittedCount),
            'student_count' => $studentCount,
        ];
    }
}
