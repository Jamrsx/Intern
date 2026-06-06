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

export const FACE_MATCH_THRESHOLD = 0.45;

/** Reject weak face detections before attempting a match. */
export const FACE_VERIFY_MIN_BOX_SCORE = 0.52;

/** Faster preview box updates (tiny detector, low-res snapshot). */
export const FACE_TRACK_MIN_INTERVAL_MS = 180;
export const FACE_TRACK_SNAPSHOT_QUALITY = 45;
export const FACE_TRACK_DETECTOR_INPUT_SIZE = 224;
export const FACE_TRACK_SCORE_THRESHOLD = 0.38;

/** Descriptor capture for enroll (higher quality, stricter detection). */
export const FACE_DESCRIPTOR_SNAPSHOT_QUALITY = 65;
export const FACE_DESCRIPTOR_DETECTOR_INPUT_SIZE = 256;
export const FACE_DESCRIPTOR_SCORE_THRESHOLD = 0.5;
export const FACE_ENROLL_DESCRIPTOR_INTERVAL_MS = 850;

/** Verify punch — dedicated capture, stricter than preview tracking. */
export const FACE_VERIFY_SNAPSHOT_QUALITY = 62;

/** Auto time punch — reuse track frame, fast detector, quick retries. */
export const FACE_AUTO_VERIFY_DESCRIPTOR_INTERVAL_MS = 500;
export const FACE_VERIFY_TRIGGER_DEBOUNCE_MS = 150;
export const FACE_VERIFY_STABLE_FRAMES = 2;
export const FACE_BOX_SMOOTH_BLEND = 0.62;

/** Pause between automatic time in/out to prevent accidental double punches. */
export const PUNCH_COOLDOWN_MS = 2 * 60 * 1000;
