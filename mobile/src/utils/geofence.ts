const EARTH_RADIUS_METERS = 6_371_000;

export function distanceMeters(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number,
): number {
    const latFrom = (latitudeA * Math.PI) / 180;
    const latTo = (latitudeB * Math.PI) / 180;
    const latDelta = ((latitudeB - latitudeA) * Math.PI) / 180;
    const lngDelta = ((longitudeB - longitudeA) * Math.PI) / 180;

    const a =
        Math.sin(latDelta / 2) ** 2 +
        Math.cos(latFrom) * Math.cos(latTo) * Math.sin(lngDelta / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_METERS * c;
}

export function isWithinGeofence(
    latitude: number,
    longitude: number,
    centerLatitude: number,
    centerLongitude: number,
    radiusMeters: number,
    accuracyMeters: number | null = null,
): boolean {
    const distance = distanceMeters(
        latitude,
        longitude,
        centerLatitude,
        centerLongitude,
    );
    const grace = Math.min(Math.max(accuracyMeters ?? 0, 0), 30);

    return distance <= radiusMeters + grace;
}

export function formatDistanceMeters(meters: number): string {
    if (meters >= 1000) {
        const km = meters / 1000;
        return km % 1 === 0 ? `${km} km` : `${km.toFixed(1)} km`;
    }

    return `${Math.round(meters)} m`;
}
