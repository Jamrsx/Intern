import Geolocation, {
    type GeolocationError,
} from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';
import {
    hydrateLocationCache,
    readMemoryLocationCache,
    writeLocationCache,
    type StoredDeviceLocation,
} from '../storage/locationCacheStorage';

export type DeviceLocation = {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
};

export type LocationFailureReason =
    | 'permission_denied'
    | 'position_unavailable'
    | 'timeout'
    | 'unknown';

export class LocationAcquisitionError extends Error {
    reason: LocationFailureReason;

    constructor(reason: LocationFailureReason, message?: string) {
        super(message ?? reason);
        this.reason = reason;
    }
}

export const VICINITY_FAST_CACHE_MS = 3 * 60 * 1000;
export const VICINITY_STALE_CACHE_MS = 15 * 60 * 1000;

type GetLocationOptions = {
    allowStaleCacheOnFailure?: boolean;
    maxAcceptableCacheAgeMs?: number;
};

function parseGeolocationFailure(
    error: GeolocationError | unknown,
): LocationFailureReason {
    const code =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as GeolocationError).code === 'number'
            ? (error as GeolocationError).code
            : null;

    switch (code) {
        case 1:
            return 'permission_denied';
        case 2:
            return 'position_unavailable';
        case 3:
            return 'timeout';
        default:
            return 'unknown';
    }
}

function readPosition(options: {
    enableHighAccuracy: boolean;
    timeout: number;
    maximumAge: number;
}): Promise<DeviceLocation> {
    return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
            (position) => {
                const location: DeviceLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracyMeters: position.coords.accuracy ?? null,
                };

                console.log('Device location acquired', {
                    ...location,
                    highAccuracy: options.enableHighAccuracy,
                    maximumAge: options.maximumAge,
                });
                resolve(location);
            },
            (error) => {
                console.log('Device location failed', {
                    code: error.code,
                    message: error.message,
                    highAccuracy: options.enableHighAccuracy,
                });
                reject(error);
            },
            options,
        );
    });
}

async function fetchGpsLocation(): Promise<DeviceLocation> {
    const attempts: Array<{
        enableHighAccuracy: boolean;
        timeout: number;
        maximumAge: number;
    }> = [
        {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: VICINITY_FAST_CACHE_MS,
        },
        {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 30000,
        },
    ];

    let lastReason: LocationFailureReason = 'unknown';

    for (const options of attempts) {
        try {
            return await readPosition(options);
        } catch (error) {
            lastReason = parseGeolocationFailure(error);

            if (lastReason === 'permission_denied') {
                throw new LocationAcquisitionError('permission_denied');
            }
        }
    }

    throw new LocationAcquisitionError(lastReason);
}

function storedToDeviceLocation(stored: StoredDeviceLocation): DeviceLocation {
    return {
        latitude: stored.latitude,
        longitude: stored.longitude,
        accuracyMeters: stored.accuracyMeters,
    };
}

export async function hasLocationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
        return true;
    }

    const [fineGranted, coarseGranted] = await Promise.all([
        PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ),
        PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ),
    ]);

    return fineGranted || coarseGranted;
}

function requestIosLocationAuthorization(): Promise<void> {
    if (Platform.OS !== 'ios') {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        Geolocation.requestAuthorization(
            () => resolve(),
            (error) => reject(error),
        );
    });
}

export async function requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
        try {
            await requestIosLocationAuthorization();
            console.log('iOS location authorization requested');
        } catch (error) {
            console.log('iOS location authorization failed', error);
        }

        return true;
    }

    const alreadyGranted = await hasLocationPermission();

    if (alreadyGranted) {
        return true;
    }

    const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
            title: 'Location permission',
            message:
                'OCC Intern needs your location to verify you are at your OJT company when timing in or out.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
        },
    );

    console.log('Location permission result', { granted });

    return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function isPermissionLocationFailure(
    error: unknown,
): error is LocationAcquisitionError {
    return (
        error instanceof LocationAcquisitionError &&
        error.reason === 'permission_denied'
    );
}

export async function getCurrentDeviceLocation(
    options: GetLocationOptions = {},
): Promise<DeviceLocation> {
    const {
        allowStaleCacheOnFailure = true,
        maxAcceptableCacheAgeMs,
    } = options;

    await hydrateLocationCache();

    if (maxAcceptableCacheAgeMs !== undefined) {
        const cached = readMemoryLocationCache(maxAcceptableCacheAgeMs);

        if (cached) {
            console.log('Device location served from cache', {
                ageMs: Date.now() - cached.savedAt,
            });

            return storedToDeviceLocation(cached);
        }
    }

    try {
        const location = await fetchGpsLocation();
        await writeLocationCache(location);

        return location;
    } catch (error) {
        if (
            allowStaleCacheOnFailure &&
            error instanceof LocationAcquisitionError &&
            error.reason !== 'permission_denied'
        ) {
            const stale = readMemoryLocationCache(VICINITY_STALE_CACHE_MS);

            if (stale) {
                console.log('Device location fallback to stale cache', {
                    ageMs: Date.now() - stale.savedAt,
                    reason: error.reason,
                });

                return storedToDeviceLocation(stale);
            }
        }

        throw error;
    }
}
