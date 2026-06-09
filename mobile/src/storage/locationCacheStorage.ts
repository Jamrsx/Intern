import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@occ_intern/device_location_cache';

export type StoredDeviceLocation = {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
    savedAt: number;
};

type WritableLocation = Pick<
    StoredDeviceLocation,
    'latitude' | 'longitude' | 'accuracyMeters'
>;

let memoryCache: StoredDeviceLocation | null = null;

function isValidStoredLocation(value: unknown): value is StoredDeviceLocation {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const record = value as StoredDeviceLocation;

    return (
        typeof record.latitude === 'number' &&
        typeof record.longitude === 'number' &&
        (record.accuracyMeters === null ||
            typeof record.accuracyMeters === 'number') &&
        typeof record.savedAt === 'number'
    );
}

export async function hydrateLocationCache(): Promise<StoredDeviceLocation | null> {
    if (memoryCache) {
        return memoryCache;
    }

    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as unknown;

        if (!isValidStoredLocation(parsed)) {
            await AsyncStorage.removeItem(STORAGE_KEY);
            return null;
        }

        memoryCache = parsed;
        console.log('Device location cache hydrated', {
            ageMs: Date.now() - parsed.savedAt,
        });

        return memoryCache;
    } catch (error) {
        console.log('Device location cache hydrate failed', error);
        await AsyncStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

export function readMemoryLocationCache(
    maxAgeMs: number,
): StoredDeviceLocation | null {
    if (!memoryCache) {
        return null;
    }

    const ageMs = Date.now() - memoryCache.savedAt;

    if (ageMs > maxAgeMs) {
        return null;
    }

    return memoryCache;
}

export async function readLocationCache(
    maxAgeMs: number,
): Promise<StoredDeviceLocation | null> {
    await hydrateLocationCache();

    return readMemoryLocationCache(maxAgeMs);
}

export async function writeLocationCache(
    location: WritableLocation,
): Promise<StoredDeviceLocation> {
    const stored: StoredDeviceLocation = {
        ...location,
        savedAt: Date.now(),
    };

    memoryCache = stored;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    console.log('Device location cache saved', {
        latitude: stored.latitude,
        longitude: stored.longitude,
        accuracyMeters: stored.accuracyMeters,
    });

    return stored;
}

export async function clearLocationCache(): Promise<void> {
    memoryCache = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
}
