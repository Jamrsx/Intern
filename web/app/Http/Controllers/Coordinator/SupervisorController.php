<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Coordinator\Concerns\ResolvesCoordinatorCourse;
use App\Http\Requests\Coordinator\StoreSupervisorRequest;
use App\Http\Requests\Coordinator\UpdateSupervisorRequest;
use App\Mail\SupervisorAccountCredentialsMail;
use App\Models\Company;
use App\Models\Course;
use App\Models\Role;
use App\Models\Section;
use App\Models\Student;
use App\Models\Supervisor;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SupervisorController extends Controller
{
    use ResolvesCoordinatorCourse;

    public function index(Request $request): Response
    {
        $section = $this->coordinatorSection($request);

        if ($section === null) {
            return Inertia::render('coordinator/supervisors', [
                'section' => null,
                'companies' => [],
                'supervisors' => [],
            ]);
        }

        $course = $section->course;

        $companies = Company::query()
            ->where('course_id', $course->id)
            ->where('is_active', true)
            ->with(['departments' => fn ($query) => $query
                ->where('is_active', true)
                ->orderBy('name')])
            ->orderBy('name')
            ->get()
            ->map(fn (Company $company) => [
                'id' => $company->id,
                'name' => $company->name,
                'departments' => $company->departments->map(fn ($department) => [
                    'id' => $department->id,
                    'name' => $department->name,
                ])->values()->all(),
            ])
            ->values()
            ->all();

        $supervisors = Supervisor::query()
            ->whereHas('company', fn ($query) => $query->where('course_id', $course->id))
            ->with([
                'user:id,name,email,is_active',
                'company:id,name',
                'department:id,name',
            ])
            ->orderBy('id')
            ->get()
            ->map(fn (Supervisor $supervisor) => [
                'id' => $supervisor->id,
                'name' => $supervisor->user->name,
                'email' => $supervisor->user->email,
                'company_id' => $supervisor->company_id,
                'company' => $supervisor->company ? [
                    'id' => $supervisor->company->id,
                    'name' => $supervisor->company->name,
                ] : null,
                'department_id' => $supervisor->department_id,
                'department' => $supervisor->department ? [
                    'id' => $supervisor->department->id,
                    'name' => $supervisor->department->name,
                ] : null,
                'position_title' => $supervisor->position_title,
                'students_count' => $this->internCountForSupervisor($supervisor, $section),
                'is_active' => $supervisor->is_active && $supervisor->user->is_active,
            ])
            ->values()
            ->all();

        return Inertia::render('coordinator/supervisors', [
            'section' => $this->coordinatorSectionPayload($section),
            'companies' => $companies,
            'supervisors' => $supervisors,
        ]);
    }

    public function store(StoreSupervisorRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $sendCredentialsEmail = $request->boolean('send_credentials_email');
        $password = $sendCredentialsEmail
            ? Str::password(10)
            : (string) $validated['password'];

        DB::transaction(function () use ($validated, $password): void {
            $supervisorRoleId = Role::query()->where('name', 'supervisor')->valueOrFail('id');

            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $password,
                'role_id' => $supervisorRoleId,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            Supervisor::query()->create([
                'user_id' => $user->id,
                'company_id' => $validated['company_id'],
                'department_id' => $validated['department_id'] ?? null,
                'position_title' => $validated['position_title'] ?? null,
                'is_active' => true,
            ]);
        });

        $supervisor = Supervisor::query()
            ->whereHas('user', fn ($query) => $query->where('email', $validated['email']))
            ->firstOrFail();

        if ($sendCredentialsEmail) {
            try {
                $this->sendSupervisorCredentials($supervisor, $password);
            } catch (\Throwable $exception) {
                report($exception);

                Inertia::flash('toast', [
                    'type' => 'error',
                    'message' => "Supervisor {$validated['name']} was created, but the credentials email could not be sent.",
                ]);

                return redirect()->route('coordinators.supervisors.index');
            }

            Inertia::flash('toast', [
                'type' => 'success',
                'message' => "Supervisor {$validated['name']} created and login credentials were emailed.",
            ]);

            return redirect()->route('coordinators.supervisors.index');
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Supervisor {$validated['name']} created. Password: {$password}",
        ]);

        return redirect()->route('coordinators.supervisors.index');
    }

    public function update(UpdateSupervisorRequest $request, Supervisor $supervisor): RedirectResponse
    {
        $course = $this->coordinatorCourseOrFail($request);
        $supervisor->loadMissing('company');
        abort_unless($supervisor->company?->course_id === $course->id, 404);

        $validated = $request->validated();
        $isActive = $request->boolean('is_active', $supervisor->is_active);

        if (empty($validated['department_id'])) {
            $validated['department_id'] = null;
        }

        DB::transaction(function () use ($supervisor, $validated, $isActive): void {
            $supervisor->user->update([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'is_active' => $isActive,
            ]);

            $supervisor->update([
                'company_id' => $validated['company_id'],
                'department_id' => $validated['department_id'],
                'position_title' => $validated['position_title'] ?? null,
                'is_active' => $isActive,
            ]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Supervisor updated successfully.',
        ]);

        return redirect()->route('coordinators.supervisors.index');
    }

    public function destroy(Request $request, Supervisor $supervisor): RedirectResponse
    {
        $course = $this->coordinatorCourseOrFail($request);
        $supervisor->loadMissing('company');
        abort_unless($supervisor->company?->course_id === $course->id, 404);

        if ($this->supervisorHasActiveInternsInCourse($supervisor, $course)) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Cannot deactivate a supervisor with active interns in their department.',
            ]);

            return redirect()->route('coordinators.supervisors.index');
        }

        DB::transaction(function () use ($supervisor): void {
            $supervisor->update(['is_active' => false]);
            $supervisor->user->update(['is_active' => false]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Supervisor deactivated.',
        ]);

        return redirect()->route('coordinators.supervisors.index');
    }

    public function mailCredentials(Request $request, Supervisor $supervisor): RedirectResponse
    {
        $course = $this->coordinatorCourseOrFail($request);
        $supervisor->loadMissing(['company', 'department', 'user']);
        abort_unless($supervisor->company?->course_id === $course->id, 404);
        abort_unless($supervisor->is_active && $supervisor->user->is_active, 422);

        try {
            $this->sendSupervisorCredentials($supervisor);
        } catch (\Throwable $exception) {
            report($exception);

            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Unable to send supervisor credentials. Please check your mail settings and try again.',
            ]);

            return redirect()->route('coordinators.supervisors.index');
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Login credentials sent to {$supervisor->user->name}. Their password was reset to a new temporary password.",
        ]);

        return redirect()->route('coordinators.supervisors.index');
    }

    private function sendSupervisorCredentials(
        Supervisor $supervisor,
        ?string $plainPassword = null,
    ): string {
        $supervisor->loadMissing(['user', 'company', 'department']);

        $password = $plainPassword ?? Str::password(10);

        $supervisor->user->update([
            'password' => $password,
        ]);

        Mail::to($supervisor->user->email)->send(
            new SupervisorAccountCredentialsMail(
                supervisor: $supervisor->user,
                companyName: $supervisor->company?->name,
                departmentName: $supervisor->department?->name,
                plainPassword: $password,
                loginUrl: route('login'),
            ),
        );

        return $password;
    }

    private function internCountForSupervisor(Supervisor $supervisor, Section $section): int
    {
        $query = Student::query()
            ->where('is_active', true)
            ->where('section_id', $section->id);

        if ($supervisor->department_id !== null) {
            return (clone $query)
                ->where('department_id', $supervisor->department_id)
                ->count();
        }

        return (clone $query)
            ->where('supervisor_id', $supervisor->id)
            ->count();
    }

    private function supervisorHasActiveInternsInCourse(Supervisor $supervisor, Course $course): bool
    {
        $studentQuery = Student::query()
            ->where('is_active', true)
            ->whereHas('section', fn ($query) => $query->where('course_id', $course->id));

        if ($supervisor->department_id !== null) {
            return (clone $studentQuery)
                ->where('department_id', $supervisor->department_id)
                ->exists();
        }

        return (clone $studentQuery)
            ->where('supervisor_id', $supervisor->id)
            ->exists();
    }
}
