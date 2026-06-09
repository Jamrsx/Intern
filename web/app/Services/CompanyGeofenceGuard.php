<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Student;
use App\Support\Geofence;
use Illuminate\Validation\ValidationException;

class CompanyGeofenceGuard
{
    /**
     * @return array<string, mixed>
     */
    public function statusPayload(Student $student): array
    {
        $student->loadMissing('company');
        $company = $student->company;

        if ($company === null) {
            return [
                'required' => false,
                'enabled' => false,
                'configured' => false,
                'company_name' => null,
                'latitude' => null,
                'longitude' => null,
                'radius_meters' => null,
            ];
        }

        $configured = $company->latitude !== null && $company->longitude !== null;
        $required = $company->geofence_enabled && $configured;

        return [
            'required' => $required,
            'enabled' => (bool) $company->geofence_enabled,
            'configured' => $configured,
            'company_name' => $company->name,
            'latitude' => $company->latitude !== null ? (float) $company->latitude : null,
            'longitude' => $company->longitude !== null ? (float) $company->longitude : null,
            'radius_meters' => (int) $company->geofence_radius_meters,
        ];
    }

    public function assertPunchAllowed(
        Student $student,
        ?float $latitude,
        ?float $longitude,
        ?float $locationAccuracyMeters = null,
    ): void {
        $student->loadMissing('company');
        $company = $student->company;

        if ($company === null || ! $company->geofence_enabled) {
            return;
        }

        $this->assertCompanyConfigured($company);
        $this->assertCoordinatesProvided($latitude, $longitude);
        $this->assertWithinFence($company, $latitude, $longitude, $locationAccuracyMeters);
    }

    private function assertCompanyConfigured(Company $company): void
    {
        if ($company->latitude === null || $company->longitude === null) {
            throw ValidationException::withMessages([
                'action' => [
                    'Your company work site is not configured yet. Contact your coordinator.',
                ],
            ]);
        }
    }

    private function assertCoordinatesProvided(?float $latitude, ?float $longitude): void
    {
        if ($latitude === null || $longitude === null) {
            throw ValidationException::withMessages([
                'latitude' => [
                    'Location is required to time in or out. Turn on GPS and try again.',
                ],
            ]);
        }
    }

    private function assertWithinFence(
        Company $company,
        float $latitude,
        float $longitude,
        ?float $locationAccuracyMeters,
    ): void {
        $distance = Geofence::distanceMeters(
            $latitude,
            $longitude,
            (float) $company->latitude,
            (float) $company->longitude,
        );

        $grace = min(max($locationAccuracyMeters ?? 0, 0), 30);

        if ($distance > $company->geofence_radius_meters + $grace) {
            throw ValidationException::withMessages([
                'action' => [
                    sprintf(
                        'You are outside the allowed work area (%dm from %s). Move inside the geofence and try again.',
                        (int) round($distance),
                        $company->name,
                    ),
                ],
            ]);
        }
    }
}
