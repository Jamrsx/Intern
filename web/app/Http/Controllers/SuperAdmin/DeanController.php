<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\StoreDeanRequest;
use App\Http\Requests\SuperAdmin\UpdateDeanRequest;
use App\Models\Course;
use App\Models\CourseMajor;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DeanController extends Controller
{
    public function index(): Response
    {
        $portalRoleIds = Role::query()
            ->whereIn('name', ['dean', 'program_head'])
            ->pluck('id');

        $leaders = User::query()
            ->with([
                'role:id,name,label',
                'courseAsDean:id,code,name,dean_user_id',
                'courseMajorAsProgramHead' => fn ($query) => $query->with('course:id,code,name'),
            ])
            ->whereIn('role_id', $portalRoleIds)
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_active' => $user->is_active,
                'role' => $user->role->name,
                'role_label' => $user->role->label,
                'course' => $user->courseAsDean ? [
                    'id' => $user->courseAsDean->id,
                    'code' => $user->courseAsDean->code,
                    'name' => $user->courseAsDean->name,
                ] : null,
                'course_major' => $user->courseMajorAsProgramHead ? [
                    'id' => $user->courseMajorAsProgramHead->id,
                    'code' => $user->courseMajorAsProgramHead->code,
                    'name' => $user->courseMajorAsProgramHead->name,
                    'course' => [
                        'id' => $user->courseMajorAsProgramHead->course->id,
                        'code' => $user->courseMajorAsProgramHead->course->code,
                        'name' => $user->courseMajorAsProgramHead->course->name,
                    ],
                ] : null,
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        $courses = Course::query()
            ->where('is_active', true)
            ->with(['majors' => fn ($query) => $query->orderBy('sort_order')->orderBy('name')])
            ->orderBy('code')
            ->get()
            ->map(fn (Course $course) => [
                'id' => $course->id,
                'code' => $course->code,
                'name' => $course->name,
                'dean_user_id' => $course->dean_user_id,
                'majors' => $course->majors->map(fn (CourseMajor $major) => [
                    'id' => $major->id,
                    'code' => $major->code,
                    'name' => $major->name,
                    'program_head_user_id' => $major->program_head_user_id,
                ])->values()->all(),
            ])
            ->values()
            ->all();

        return Inertia::render('superAdmin/deans', [
            'leaders' => $leaders,
            'courses' => $courses,
        ]);
    }

    public function store(StoreDeanRequest $request): RedirectResponse
    {
        $roleName = $request->validated('role');
        $roleId = Role::query()->where('name', $roleName)->valueOrFail('id');

        DB::transaction(function () use ($request, $roleId, $roleName): void {
            $user = User::query()->create([
                'name' => $request->validated('name'),
                'email' => $request->validated('email'),
                'password' => $request->validated('password'),
                'role_id' => $roleId,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            $this->syncLeaderAssignment(
                $user,
                $roleName,
                $request->validated('course_id'),
                $request->validated('course_major_id'),
            );
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $roleName === 'program_head'
                ? 'Program head account created successfully.'
                : 'Dean account created successfully.',
        ]);

        return redirect()->route('superadmin.deans.index');
    }

    public function update(UpdateDeanRequest $request, User $dean): RedirectResponse
    {
        abort_unless($dean->hasRole('dean') || $dean->hasRole('program_head'), 404);

        $roleName = $request->validated('role');
        $roleId = Role::query()->where('name', $roleName)->valueOrFail('id');

        DB::transaction(function () use ($request, $dean, $roleId, $roleName): void {
            $dean->fill([
                'name' => $request->validated('name'),
                'email' => $request->validated('email'),
                'is_active' => $request->validated('is_active'),
                'role_id' => $roleId,
            ]);

            if ($request->filled('password')) {
                $dean->password = $request->validated('password');
            }

            $dean->save();

            $this->syncLeaderAssignment(
                $dean,
                $roleName,
                $request->validated('course_id'),
                $request->validated('course_major_id'),
            );
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Account updated successfully.',
        ]);

        return redirect()->route('superadmin.deans.index');
    }

    public function destroy(User $dean): RedirectResponse
    {
        abort_unless($dean->hasRole('dean') || $dean->hasRole('program_head'), 404);

        DB::transaction(function () use ($dean): void {
            Course::query()
                ->where('dean_user_id', $dean->id)
                ->update(['dean_user_id' => null]);

            CourseMajor::query()
                ->where('program_head_user_id', $dean->id)
                ->update(['program_head_user_id' => null]);

            $dean->update(['is_active' => false]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Account deactivated.',
        ]);

        return redirect()->route('superadmin.deans.index');
    }

    private function syncLeaderAssignment(
        User $user,
        string $role,
        ?int $courseId,
        ?int $courseMajorId,
    ): void {
        Course::query()
            ->where('dean_user_id', $user->id)
            ->update(['dean_user_id' => null]);

        CourseMajor::query()
            ->where('program_head_user_id', $user->id)
            ->update(['program_head_user_id' => null]);

        if ($role === 'dean' && $courseId !== null) {
            Course::query()
                ->whereKey($courseId)
                ->update(['dean_user_id' => $user->id]);
        }

        if ($role === 'program_head' && $courseMajorId !== null) {
            CourseMajor::query()
                ->whereKey($courseMajorId)
                ->update(['program_head_user_id' => $user->id]);
        }
    }
}
