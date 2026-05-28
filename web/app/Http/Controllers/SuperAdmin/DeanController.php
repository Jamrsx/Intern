<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\StoreDeanRequest;
use App\Http\Requests\SuperAdmin\UpdateDeanRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class DeanController extends Controller
{
    public function index(): Response
    {
        $deanRoleId = Role::query()->where('name', 'dean')->value('id');

        $deans = User::query()
            ->with('courseAsDean:id,code,name,dean_user_id')
            ->where('role_id', $deanRoleId)
            ->orderBy('name')
            ->get()
            ->map(fn (User $dean) => [
                'id' => $dean->id,
                'name' => $dean->name,
                'email' => $dean->email,
                'is_active' => $dean->is_active,
                'course' => $dean->courseAsDean ? [
                    'id' => $dean->courseAsDean->id,
                    'code' => $dean->courseAsDean->code,
                    'name' => $dean->courseAsDean->name,
                ] : null,
                'created_at' => $dean->created_at?->toIso8601String(),
            ]);

        return Inertia::render('superAdmin/deans', [
            'deans' => $deans,
        ]);
    }

    public function store(StoreDeanRequest $request): RedirectResponse
    {
        $deanRoleId = Role::query()->where('name', 'dean')->valueOrFail('id');

        User::query()->create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
            'role_id' => $deanRoleId,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Dean account created successfully.',
        ]);

        return redirect()->route('superadmin.deans.index');
    }

    public function update(UpdateDeanRequest $request, User $dean): RedirectResponse
    {
        abort_unless($dean->hasRole('dean'), 404);

        $dean->fill([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'is_active' => $request->validated('is_active'),
        ]);

        if ($request->filled('password')) {
            $dean->password = $request->validated('password');
        }

        $dean->save();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Dean account updated successfully.',
        ]);

        return redirect()->route('superadmin.deans.index');
    }

    public function destroy(User $dean): RedirectResponse
    {
        abort_unless($dean->hasRole('dean'), 404);

        $dean->update(['is_active' => false]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Dean account deactivated.',
        ]);

        return redirect()->route('superadmin.deans.index');
    }
}
