<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Dean\Concerns\ResolvesDeanScope;
use App\Http\Requests\Dean\StoreSchoolYearRequest;
use App\Http\Requests\Dean\UpdateSchoolYearRequest;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Services\SchoolYearArchivingService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SchoolYearController extends Controller
{
    use ResolvesDeanScope;

    public function __construct(
        private readonly SchoolYearArchivingService $schoolYearArchivingService,
    ) {}

    public function index(Request $request): Response
    {
        $course = $this->deanCourse($request);

        $schoolYearsQuery = SchoolYear::query()->orderByDesc('name');

        if ($course !== null) {
            $schoolYearsQuery->withCount([
                'sections' => fn ($query) => $this->applyDeanSectionScopeToRelation($query, $request),
            ]);
        } else {
            $schoolYearsQuery->withCount([
                'sections' => fn ($query) => $query->whereRaw('1 = 0'),
            ]);
        }

        $schoolYears = $schoolYearsQuery
            ->get()
            ->map(fn (SchoolYear $schoolYear) => [
                'id' => $schoolYear->id,
                'name' => $schoolYear->name,
                'start_date' => $schoolYear->start_date?->toDateString(),
                'end_date' => $schoolYear->end_date?->toDateString(),
                'is_active' => $schoolYear->is_active,
                'sections_count' => $schoolYear->sections_count,
                'created_at' => $schoolYear->created_at?->toIso8601String(),
            ]);

        return Inertia::render('deans/school-years', [
            'course' => $this->deanPortalContextPayload($request),
            'schoolYears' => $schoolYears,
        ]);
    }

    public function store(StoreSchoolYearRequest $request): RedirectResponse
    {
        $isActive = $request->boolean('is_active');

        DB::transaction(function () use ($request, $isActive): void {
            if ($isActive) {
                $schoolYearsToArchive = SchoolYear::query()
                    ->where('is_active', true)
                    ->get();

                SchoolYear::query()->update(['is_active' => false]);

                foreach ($schoolYearsToArchive as $schoolYear) {
                    $this->schoolYearArchivingService->archive($schoolYear);
                }
            }

            SchoolYear::query()->create([
                'name' => $request->validated('name'),
                'start_date' => $request->validated('start_date'),
                'end_date' => $request->validated('end_date'),
                'is_active' => $isActive,
            ]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'School year created successfully.',
        ]);

        return redirect()->route('deans.school-years.index');
    }

    public function update(UpdateSchoolYearRequest $request, SchoolYear $schoolYear): RedirectResponse
    {
        $isActive = $request->boolean('is_active');
        $archivedStudents = 0;

        DB::transaction(function () use ($request, $schoolYear, $isActive, &$archivedStudents): void {
            if ($isActive) {
                $schoolYearsToArchive = SchoolYear::query()
                    ->whereKeyNot($schoolYear->id)
                    ->where('is_active', true)
                    ->get();

                SchoolYear::query()
                    ->whereKeyNot($schoolYear->id)
                    ->update(['is_active' => false]);

                foreach ($schoolYearsToArchive as $inactiveSchoolYear) {
                    $archivedStudents += $this->schoolYearArchivingService->archive(
                        $inactiveSchoolYear,
                    );
                }
            }

            $schoolYear->update([
                'name' => $request->validated('name'),
                'start_date' => $request->validated('start_date'),
                'end_date' => $request->validated('end_date'),
                'is_active' => $isActive,
            ]);

            if (! $isActive) {
                $archivedStudents += $this->schoolYearArchivingService->archive($schoolYear);
            }
        });

        $message = 'School year updated successfully.';

        if (! $isActive && $archivedStudents > 0) {
            $message = "{$schoolYear->name} was closed. {$archivedStudents} student account(s) were set to inactive.";
        } elseif (! $isActive) {
            $message = "{$schoolYear->name} was closed.";
        } elseif ($archivedStudents > 0) {
            $message .= " {$archivedStudents} student account(s) from other school years were set to inactive.";
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $message,
        ]);

        return redirect()->route('deans.school-years.index');
    }

    public function activate(SchoolYear $schoolYear): RedirectResponse
    {
        $archivedStudents = 0;

        DB::transaction(function () use ($schoolYear, &$archivedStudents): void {
            $schoolYearsToArchive = SchoolYear::query()
                ->whereKeyNot($schoolYear->id)
                ->where('is_active', true)
                ->get();

            SchoolYear::query()->update(['is_active' => false]);

            foreach ($schoolYearsToArchive as $inactiveSchoolYear) {
                $archivedStudents += $this->schoolYearArchivingService->archive(
                    $inactiveSchoolYear,
                );
            }

            $schoolYear->update(['is_active' => true]);
        });

        $message = "{$schoolYear->name} is now the active school year.";

        if ($archivedStudents > 0) {
            $message .= " {$archivedStudents} student account(s) from other school years were set to inactive.";
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $message,
        ]);

        return redirect()->route('deans.school-years.index');
    }

    public function destroy(Request $request, SchoolYear $schoolYear): RedirectResponse
    {
        $archivedStudents = 0;

        DB::transaction(function () use ($schoolYear, &$archivedStudents): void {
            $schoolYear->update(['is_active' => false]);
            $archivedStudents = $this->schoolYearArchivingService->archive($schoolYear);
        });

        $message = "{$schoolYear->name} was closed.";

        if ($archivedStudents > 0) {
            $message .= " {$archivedStudents} student account(s) were set to inactive.";
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $message,
        ]);

        return redirect()->route('deans.school-years.index');
    }

    public function archive(Request $request): Response
    {
        $course = $this->deanCourse($request);

        abort_if($course === null, 403, 'You are not assigned to a course yet.');

        SchoolYear::query()
            ->where('is_active', false)
            ->orderByDesc('name')
            ->get()
            ->each(fn (SchoolYear $schoolYear) => $this->schoolYearArchivingService->archive($schoolYear));

        $archivedSchoolYears = SchoolYear::query()
            ->where('is_active', false)
            ->orderByDesc('name')
            ->with([
                'sections' => fn ($query) => $this->applyDeanSectionScopeToRelation($query, $request)
                    ->with([
                        'coordinator:id,name,email',
                        'students' => fn ($studentQuery) => $studentQuery
                            ->with([
                                'user:id,email,is_active',
                                'company:id,name',
                                'department:id,name',
                                'supervisor.user:id,name',
                            ])
                            ->orderBy('last_name')
                            ->orderBy('first_name'),
                    ])
                    ->orderBy('name'),
            ])
            ->get()
            ->map(fn (SchoolYear $schoolYear) => [
                'id' => $schoolYear->id,
                'name' => $schoolYear->name,
                'start_date' => $schoolYear->start_date?->toDateString(),
                'end_date' => $schoolYear->end_date?->toDateString(),
                'sections' => $schoolYear->sections->map(fn ($section) => [
                    'id' => $section->id,
                    'name' => $section->name,
                    'display_name' => trim("{$course->code} {$section->name}"),
                    'is_active' => $section->is_active,
                    'coordinator' => $section->coordinator ? [
                        'id' => $section->coordinator->id,
                        'name' => $section->coordinator->name,
                        'email' => $section->coordinator->email,
                    ] : null,
                    'students' => $section->students->map(fn ($student) => [
                        'id' => $student->id,
                        'student_number' => $student->student_number,
                        'full_name' => $student->fullName(),
                        'email' => $student->user->email,
                        'is_active' => $student->is_active && $student->user->is_active,
                        'internship' => [
                            'company' => $student->company?->name,
                            'department' => $student->department?->name,
                            'supervisor' => $student->supervisor?->user?->name,
                        ],
                    ])->values()->all(),
                    'students_count' => $section->students->count(),
                ])->values()->all(),
                'sections_count' => $schoolYear->sections->count(),
                'students_count' => $schoolYear->sections->sum(
                    fn ($section) => $section->students->count(),
                ),
            ])
            ->values();

        return Inertia::render('deans/school-years/archive', [
            'course' => $this->deanPortalContextPayload($request),
            'archivedSchoolYears' => $archivedSchoolYears,
        ]);
    }

    /**
     * @param  Builder<Section>  $query
     * @return Builder<Section>
     */
    private function applyDeanSectionScopeToRelation($query, Request $request)
    {
        $course = $this->deanCourse($request);

        if ($course === null) {
            return $query->whereRaw('1 = 0');
        }

        $query->where('course_id', $course->id);

        $major = $this->deanMajor($request);

        if ($major !== null) {
            $query->where('course_major_id', $major->id);
        }

        return $query;
    }
}
