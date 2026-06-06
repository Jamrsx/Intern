import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMBEDDING_LENGTH } from '../constants/face';

const KEY_PREFIX = '@occ_intern/face_embedding';

function storageKey(userId: number): string {
    return `${KEY_PREFIX}/${userId}`;
}

export async function saveEnrolledFaceEmbedding(
    userId: number,
    embedding: number[],
): Promise<void> {
    if (embedding.length !== EMBEDDING_LENGTH) {
        throw new Error('Invalid face embedding length.');
    }

    await AsyncStorage.setItem(
        storageKey(userId),
        JSON.stringify(embedding),
    );
    console.log('Enrolled face embedding saved locally', { userId });
}

export async function getEnrolledFaceEmbedding(
    userId: number,
): Promise<number[] | null> {
    const raw = await AsyncStorage.getItem(storageKey(userId));

    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as number[];

        if (!Array.isArray(parsed) || parsed.length !== EMBEDDING_LENGTH) {
            await AsyncStorage.removeItem(storageKey(userId));
            return null;
        }

        return parsed;
    } catch {
        await AsyncStorage.removeItem(storageKey(userId));
        return null;
    }
}

export async function clearEnrolledFaceEmbedding(
    userId: number,
): Promise<void> {
    await AsyncStorage.removeItem(storageKey(userId));
    console.log('Enrolled face embedding cleared', { userId });
}
