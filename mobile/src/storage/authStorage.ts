import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoredSession } from '../types/auth';

const SESSION_KEY = '@occ_intern/session';

export async function saveSession(session: StoredSession): Promise<void> {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    console.log('Session saved', { userId: session.user.id });
}

export async function getSession(): Promise<StoredSession | null> {
    const raw = await AsyncStorage.getItem(SESSION_KEY);

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as StoredSession;
    } catch {
        await AsyncStorage.removeItem(SESSION_KEY);
        return null;
    }
}

export async function clearSession(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
    console.log('Session cleared');
}
