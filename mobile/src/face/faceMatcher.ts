import { EMBEDDING_LENGTH, FACE_MATCH_THRESHOLD } from '../constants/face';

export function euclideanDistance(
    descriptorA: number[],
    descriptorB: number[],
): number {
    if (
        descriptorA.length !== EMBEDDING_LENGTH ||
        descriptorB.length !== EMBEDDING_LENGTH
    ) {
        throw new Error('Face embedding length must be 128.');
    }

    let sum = 0;

    for (let index = 0; index < descriptorA.length; index += 1) {
        const delta = descriptorA[index] - descriptorB[index];
        sum += delta * delta;
    }

    return Math.sqrt(sum);
}

export function faceMatches(
    enrolled: number[],
    scanned: number[],
    threshold: number = FACE_MATCH_THRESHOLD,
): boolean {
    return euclideanDistance(enrolled, scanned) <= threshold;
}
