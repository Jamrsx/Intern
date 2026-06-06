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

/** Faster preview box updates (tiny detector, low-res snapshot). */
export const FACE_TRACK_MIN_INTERVAL_MS = 220;
export const FACE_TRACK_SNAPSHOT_QUALITY = 40;
export const FACE_TRACK_DETECTOR_INPUT_SIZE = 224;
export const FACE_TRACK_SCORE_THRESHOLD = 0.38;

/** Descriptor capture for enroll / time punch (slightly higher quality). */
export const FACE_DESCRIPTOR_SNAPSHOT_QUALITY = 65;
export const FACE_DESCRIPTOR_DETECTOR_INPUT_SIZE = 320;
export const FACE_DESCRIPTOR_SCORE_THRESHOLD = 0.45;
export const FACE_ENROLL_DESCRIPTOR_INTERVAL_MS = 850;
export const FACE_BOX_SMOOTH_BLEND = 0.62;
