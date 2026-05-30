<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dean\StoreSchoolYearRequest;
use App\Http\Requests\Dean\UpdateSchoolYearRequest;
use App\Models\SchoolYear;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SchoolYearController extends Controller
{
    public function index(): Response
    {
        $schoolYears = SchoolYear::query()
            ->withCount('sections')
            ->orderByDesc('name')
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
            'schoolYears' => $schoolYears,
        ]);
    }

    public function store(StoreSchoolYearRequest $request): RedirectResponse
    {
        $isActive = $request->boolean('is_active');

        DB::transaction(function () use ($request, $isActive): void {
            if ($isActive) {
                SchoolYear::query()->update(['is_active' => false]);
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

        DB::transaction(function () use ($request, $schoolYear, $isActive): void {
            if ($isActive) {
                SchoolYear::query()
                    ->whereKeyNot($schoolYear->id)
                    ->update(['is_active' => false]);
            }

            $schoolYear->update([
                'name' => $request->validated('name'),
                'start_date' => $request->validated('start_date'),
                'end_date' => $request->validated('end_date'),
                'is_active' => $isActive,
            ]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'School year updated successfully.',
        ]);

        return redirect()->route('deans.school-years.index');
    }

    public function activate(SchoolYear $schoolYear): RedirectResponse
    {
        DB::transaction(function () use ($schoolYear): void {
            SchoolYear::query()->update(['is_active' => false]);

            $schoolYear->update(['is_active' => true]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "{$schoolYear->name} is now the active school year.",
        ]);

        return redirect()->route('deans.school-years.index');
    }

    public function destroy(SchoolYear $schoolYear): RedirectResponse
    {
        if ($schoolYear->sections()->exists()) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Cannot deactivate a school year that has sections.',
            ]);

            return redirect()->route('deans.school-years.index');
        }

        $schoolYear->update(['is_active' => false]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'School year deactivated.',
        ]);

        return redirect()->route('deans.school-years.index');
    }
}
