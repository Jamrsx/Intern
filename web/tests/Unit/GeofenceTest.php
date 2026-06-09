<?php

use App\Support\Geofence;

it('calculates distance between two coordinates in meters', function () {
    $distance = Geofence::distanceMeters(8.4542, 124.6319, 8.4542, 124.6319);

    expect($distance)->toBe(0.0);
});

it('detects when a point is inside a geofence radius', function () {
    expect(Geofence::isWithinRadius(8.4542, 124.6319, 8.4542, 124.6319, 10))->toBeTrue();
    expect(Geofence::isWithinRadius(8.4550, 124.6319, 8.4542, 124.6319, 10))->toBeFalse();
});
