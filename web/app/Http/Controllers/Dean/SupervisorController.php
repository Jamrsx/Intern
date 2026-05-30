<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dean\StoreSupervisorRequest;
use App\Http\Requests\Dean\UpdateSupervisorRequest;
use App\Models\Company;
use App\Models\Role;
use App\Models\Student;
use App\Models\Supervisor;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SupervisorController extends Controller
{
    public function index(): Response
    {
        $companies = Company::query()
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
            ->with([
                'user:id,name,email,is_active',
                'company:id,name',
                'department:id,name',
            ])
            ->withCount([
                'students as students_count' => fn ($query) => $query->where('is_active', true),
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
                'students_count' => $supervisor->students_count,
                'is_active' => $supervisor->is_active && $supervisor->user->is_active,
            ])
            ->values()
            ->all();

        return Inertia::render('deans/supervisors', [
            'companies' => $companies,
            'supervisors' => $supervisors,
        ]);
    }

    public function store(StoreSupervisorRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $password = Str::password(10);

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

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Supervisor {$validated['name']} created. Temporary password: {$password}",
        ]);

        return redirect()->route('deans.supervisors.index');
    }

    public function update(UpdateSupervisorRequest $request, Supervisor $supervisor): RedirectResponse
    {
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

        return redirect()->route('deans.supervisors.index');
    }

    public function destroy(Supervisor $supervisor): RedirectResponse
    {
        if (
            Student::query()
                ->where('supervisor_id', $supervisor->id)
                ->where('is_active', true)
                ->exists()
        ) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Cannot deactivate a supervisor with active interns assigned.',
            ]);

            return redirect()->route('deans.supervisors.index');
        }

        DB::transaction(function () use ($supervisor): void {
            $supervisor->update(['is_active' => false]);
            $supervisor->user->update(['is_active' => false]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Supervisor deactivated.',
        ]);

        return redirect()->route('deans.supervisors.index');
    }
}
