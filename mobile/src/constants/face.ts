export const FACE_MODEL_ID = 'faceapi-128-v1' as const;

export const FACE_API_CDN =
    'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15';

export const FACE_API_MODEL_URL = `${FACE_API_CDN}/model`;

export const EMBEDDING_LENGTH = 128;

export const ENROLLMENT_SCAN_COUNT = 5;

export const ENROLLMENT_FLASH_COLORS = [
    '#EF4444',
    '#22C55E',
    '#EAB308',
    '#3B82F6',
    '#FFFFFF',
] as const;

export const FACE_MATCH_THRESHOLD = 0.6;
