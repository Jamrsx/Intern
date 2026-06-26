<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Dean\Concerns\ResolvesDeanScope;
use App\Http\Requests\Dean\StoreCoordinatorRequest;
use App\Http\Requests\Dean\UpdateCoordinatorRequest;
use App\Mail\CoordinatorAccountCredentialsMail;
use App\Models\Course;
use App\Models\Role;
use App\Models\Section;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CoordinatorController extends Controller
{
    use ResolvesDeanScope;

    public function index(Request $request): Response
    {
        $course = $this->deanCourse($request);

        if ($course === null) {
            return Inertia::render('deans/coordinators', [
                'course' => null,
                'sections' => [],
                'coordinators' => [],
            ]);
        }

        $sections = $this->deanSectionsQuery($request)
            ->with('schoolYear:id,name,is_active')
            ->with('coordinator:id,name,email,is_active')
            ->where('is_active', true)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->orderBy('name')
            ->get()
            ->map(fn (Section $section) => [
                'id' => $section->id,
                'name' => $section->name,
                'display_name' => trim("{$course->code} {$section->name}"),
                'school_year' => $section->schoolYear?->name,
                'has_coordinator' => $section->coordinator_user_id !== null,
            ])
            ->values()
            ->all();

        $coordinatorIds = $this->deanSectionsQuery($request)
            ->whereNotNull('coordinator_user_id')
            ->pluck('coordinator_user_id')
            ->unique()
            ->values();

        $coordinators = User::query()
            ->whereIn('id', $coordinatorIds)
            ->orderBy('name')
            ->get()
            ->map(function (User $coordinator) use ($request, $course) {
                $section = $this->deanSectionsQuery($request)
                    ->with('schoolYear:id,name')
                    ->where('coordinator_user_id', $coordinator->id)
                    ->first();

                return [
                    'id' => $coordinator->id,
                    'name' => $coordinator->name,
                    'email' => $coordinator->email,
                    'is_active' => $coordinator->is_active,
                    'section_id' => $section?->id,
                    'section' => $section ? [
                        'id' => $section->id,
                        'display_name' => trim("{$course->code} {$section->name}"),
                        'school_year' => $section->schoolYear?->name,
                    ] : null,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('deans/coordinators', [
            'course' => $this->deanPortalContextPayload($request),
            'sections' => $sections,
            'coordinators' => $coordinators,
        ]);
    }

    public function store(StoreCoordinatorRequest $request): RedirectResponse
    {
        $course = $this->deanCourseOrFail($request);
        $validated = $request->validated();
        $section = $request->section();
        $sendCredentialsEmail = $request->boolean('send_credentials_email');
        $password = $sendCredentialsEmail
            ? Str::password(10)
            : (string) $validated['password'];

        $this->ensureSectionInDeanScope($section, $request);

        $coordinator = DB::transaction(function () use ($validated, $section, $password) {
            $coordinatorRoleId = Role::query()->where('name', 'coordinator')->valueOrFail('id');

            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $password,
                'role_id' => $coordinatorRoleId,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            $section->update(['coordinator_user_id' => $user->id]);

            return $user;
        });

        if ($sendCredentialsEmail) {
            try {
                $this->sendCoordinatorCredentials($coordinator, $course, $password);
            } catch (\Throwable $exception) {
                report($exception);

                Inertia::flash('toast', [
                    'type' => 'error',
                    'message' => "Coordinator {$validated['name']} was created, but the credentials email could not be sent.",
                ]);

                return redirect()->route('deans.coordinators.index');
            }

            Inertia::flash('toast', [
                'type' => 'success',
                'message' => "Coordinator {$validated['name']} created and login credentials were emailed.",
            ]);

            return redirect()->route('deans.coordinators.index');
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Coordinator {$validated['name']} created. Password: {$password}",
        ]);

        return redirect()->route('deans.coordinators.index');
    }

    public function update(UpdateCoordinatorRequest $request, User $coordinator): RedirectResponse
    {
        $course = $this->deanCourseOrFail($request);
        $validated = $request->validated();
        $section = $request->section();
        $isActive = $request->boolean('is_active', $coordinator->is_active);

        $this->ensureSectionInDeanScope($section, $request);

        DB::transaction(function () use ($coordinator, $validated, $section, $request, $isActive) {
            $coordinator->update([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'is_active' => $isActive,
            ]);

            $this->deanSectionsQuery($request)
                ->where('coordinator_user_id', $coordinator->id)
                ->whereKeyNot($section->id)
                ->update(['coordinator_user_id' => null]);

            $section->update(['coordinator_user_id' => $coordinator->id]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Coordinator updated successfully.',
        ]);

        return redirect()->route('deans.coordinators.index');
    }

    public function mailCredentials(Request $request, User $coordinator): RedirectResponse
    {
        $course = $this->deanCourseOrFail($request);

        abort_unless($coordinator->hasRole('coordinator'), 404);
        abort_unless($coordinator->is_active, 422);

        $assigned = $this->deanSectionsQuery($request)
            ->where('coordinator_user_id', $coordinator->id)
            ->exists();

        abort_unless($assigned, 404);

        try {
            $this->sendCoordinatorCredentials($coordinator, $course);
        } catch (\Throwable $exception) {
            report($exception);

            Inertia::flash('toast', [
                'type' => 'error',
                'message' => "Could not send credentials to {$coordinator->name}.",
            ]);

            return redirect()->route('deans.coordinators.index');
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Login credentials sent to {$coordinator->name}. Their password was reset to a new temporary password.",
        ]);

        return redirect()->route('deans.coordinators.index');
    }

    public function destroy(Request $request, User $coordinator): RedirectResponse
    {
        $this->deanCourseOrFail($request);

        abort_unless($coordinator->hasRole('coordinator'), 404);

        $assigned = $this->deanSectionsQuery($request)
            ->where('coordinator_user_id', $coordinator->id)
            ->exists();

        abort_unless($assigned, 404);

        DB::transaction(function () use ($coordinator, $request) {
            $this->deanSectionsQuery($request)
                ->where('coordinator_user_id', $coordinator->id)
                ->update(['coordinator_user_id' => null]);

            $coordinator->update(['is_active' => false]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Coordinator deactivated.',
        ]);

        return redirect()->route('deans.coordinators.index');
    }

    private function sendCoordinatorCredentials(
        User $coordinator,
        Course $course,
        ?string $plainPassword = null,
    ): string {
        $password = $plainPassword ?? Str::password(10);

        $coordinator->update([
            'password' => $password,
        ]);

        $section = Section::query()
            ->where('course_id', $course->id)
            ->where('coordinator_user_id', $coordinator->id)
            ->first();

        $sectionName = $section
            ? trim("{$course->code} {$section->name}")
            : null;

        Mail::to($coordinator->email)->send(
            new CoordinatorAccountCredentialsMail(
                coordinator: $coordinator,
                sectionName: $sectionName,
                plainPassword: $password,
                loginUrl: route('login'),
            ),
        );

        return $password;
    }
}
