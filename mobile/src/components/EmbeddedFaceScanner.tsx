import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    LayoutChangeEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
} from 'react-native-vision-camera';
import {
    ENROLLMENT_FLASH_COLORS,
    ENROLLMENT_SCAN_COUNT,
    FACE_BOX_SMOOTH_BLEND,
    FACE_DESCRIPTOR_SNAPSHOT_QUALITY,
    FACE_ENROLL_DESCRIPTOR_INTERVAL_MS,
    FACE_AUTO_VERIFY_DESCRIPTOR_INTERVAL_MS,
    FACE_VERIFY_SNAPSHOT_QUALITY,
    FACE_VERIFY_MIN_BOX_SCORE,
    FACE_VERIFY_STABLE_FRAMES,
    FACE_VERIFY_TRIGGER_DEBOUNCE_MS,
    FACE_TRACK_MIN_INTERVAL_MS,
    FACE_TRACK_SNAPSHOT_QUALITY,
} from '../constants/face';
import { colors } from '../theme/colors';
import type { FaceScanPhase, FaceWebViewMessage, NormalizedFaceBox } from '../types/face';
import { FaceProcessorWebView, type FaceProcessorHandle } from './FaceProcessorWebView';
import { FaceTrackingBox } from './FaceTrackingBox';

const PREVIEW_HEIGHT = 300;

type Props = {
    mode: 'enroll' | 'verify';
    isActive: boolean;
    scanRequestId?: number;
    autoVerify?: boolean;
    verifyPaused?: boolean;
    statusHint?: string | null;
    onEnrollmentComplete: (embedding: number[]) => void;
    onVerifyComplete: (descriptor: number[]) => void;
    onError: (message: string) => void;
    onScanningChange?: (scanning: boolean) => void;
    isSubmitting?: boolean;
};

function averageEmbeddings(scans: number[][]): number[] {
    const length = scans[0]?.length ?? 0;
    const result = new Array(length).fill(0);

    scans.forEach((scan) => {
        scan.forEach((value, index) => {
            result[index] += value;
        });
    });

    return result.map((value) => value / scans.length);
}

function smoothBox(
    previous: NormalizedFaceBox | null,
    next: NormalizedFaceBox,
): NormalizedFaceBox {
    if (!previous) {
        return next;
    }

    const blend = FACE_BOX_SMOOTH_BLEND;

    return {
        x: previous.x * (1 - blend) + next.x * blend,
        y: previous.y * (1 - blend) + next.y * blend,
        width: previous.width * (1 - blend) + next.width * blend,
        height: previous.height * (1 - blend) + next.height * blend,
        score: next.score,
    };
}

export function EmbeddedFaceScanner({
    mode,
    isActive,
    scanRequestId = 0,
    autoVerify = false,
    verifyPaused = false,
    statusHint = null,
    onEnrollmentComplete,
    onVerifyComplete,
    onError,
    onScanningChange,
    isSubmitting = false,
}: Props) {
    const { hasPermission, requestPermission } = useCameraPermission();
    const deviceWide = useCameraDevice('front', {
        physicalDevices: ['wide-angle-camera'],
    });
    const deviceFallback = useCameraDevice('front');
    const device = deviceWide ?? deviceFallback;
    const cameraRef = useRef<Camera>(null);
    const processorRef = useRef<FaceProcessorHandle>(null);
    const trackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const trackLoopActiveRef = useRef(false);
    const enrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const autoVerifyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const verifyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const capturingRef = useRef(false);
    const faceVisibleRef = useRef(false);
    const lastTrackDataUrlRef = useRef<string | null>(null);
    const stableFaceFramesRef = useRef(0);
    const verifyAttemptInProgressRef = useRef(false);
    const verifyPausedRef = useRef(verifyPaused);
    const phaseRef = useRef<FaceScanPhase>('idle');

    const [phase, setPhase] = useState<FaceScanPhase>('idle');
    const [modelsReady, setModelsReady] = useState(false);
    const [enrollIndex, setEnrollIndex] = useState(0);
    const [flashColor, setFlashColor] = useState<string | null>(null);
    const [collectedScans, setCollectedScans] = useState<number[][]>([]);
    const [statusText, setStatusText] = useState('Starting camera…');
    const [faceBox, setFaceBox] = useState<NormalizedFaceBox | null>(null);
    const [previewWidth, setPreviewWidth] = useState(0);
    const [cameraInitialized, setCameraInitialized] = useState(false);
    const [previewStarted, setPreviewStarted] = useState(false);

    const captureReady =
        cameraInitialized &&
        previewStarted &&
        previewWidth > 0;

    const stopTrackLoop = useCallback(() => {
        trackLoopActiveRef.current = false;

        if (trackTimeoutRef.current) {
            clearTimeout(trackTimeoutRef.current);
            trackTimeoutRef.current = null;
        }
    }, []);

    const stopEnrollLoop = useCallback(() => {
        if (enrollIntervalRef.current) {
            clearInterval(enrollIntervalRef.current);
            enrollIntervalRef.current = null;
        }
    }, []);

    const stopAutoVerifyLoop = useCallback(() => {
        if (autoVerifyIntervalRef.current) {
            clearInterval(autoVerifyIntervalRef.current);
            autoVerifyIntervalRef.current = null;
        }
    }, []);

    const clearVerifyDebounce = useCallback(() => {
        if (verifyDebounceRef.current) {
            clearTimeout(verifyDebounceRef.current);
            verifyDebounceRef.current = null;
        }
    }, []);

    useEffect(() => {
        verifyPausedRef.current = verifyPaused;
    }, [verifyPaused]);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    const captureSnapshot = useCallback(
        async (quality: number): Promise<string | null> => {
            if (!cameraRef.current || capturingRef.current || !captureReady) {
                return null;
            }

            capturingRef.current = true;

            try {
                const photo = await cameraRef.current.takeSnapshot({
                    quality,
                });
                const path = photo.path.replace('file://', '');
                const base64 = await ReactNativeBlobUtil.fs.readFile(
                    path,
                    'base64',
                );

                return `data:image/jpeg;base64,${base64}`;
            } catch (error) {
                console.log('Frame capture failed', error);

                return null;
            } finally {
                capturingRef.current = false;
            }
        },
        [captureReady],
    );

    const runTrackFrame = useCallback(async () => {
        if (!modelsReady || phase === 'submitting' || !isActive) {
            return;
        }

        const dataUrl = await captureSnapshot(FACE_TRACK_SNAPSHOT_QUALITY);

        if (dataUrl) {
            lastTrackDataUrlRef.current = dataUrl;
            processorRef.current?.trackSnapshot(dataUrl);
        }
    }, [captureSnapshot, isActive, modelsReady, phase]);

    const runAutoVerifyCapture = useCallback(async () => {
        if (
            !autoVerify ||
            verifyPausedRef.current ||
            verifyAttemptInProgressRef.current ||
            phaseRef.current === 'submitting' ||
            !faceVisibleRef.current
        ) {
            return;
        }

        verifyAttemptInProgressRef.current = true;
        stopTrackLoop();
        setStatusText('Verifying…');
        console.log('Auto verify capture started');

        const dataUrl = await captureSnapshot(FACE_VERIFY_SNAPSHOT_QUALITY);

        if (!dataUrl) {
            verifyAttemptInProgressRef.current = false;
            setStatusText('Looking for your face…');
            return;
        }

        processorRef.current?.processSnapshot(dataUrl);
    }, [autoVerify, captureSnapshot, stopTrackLoop]);

    const scheduleAutoVerifyCapture = useCallback(() => {
        if (
            !autoVerify ||
            verifyPausedRef.current ||
            verifyAttemptInProgressRef.current ||
            phaseRef.current === 'submitting'
        ) {
            return;
        }

        clearVerifyDebounce();
        verifyDebounceRef.current = setTimeout(() => {
            void runAutoVerifyCapture();
        }, FACE_VERIFY_TRIGGER_DEBOUNCE_MS);
    }, [autoVerify, clearVerifyDebounce, runAutoVerifyCapture]);

    const startTrackLoop = useCallback(() => {
        stopTrackLoop();
        trackLoopActiveRef.current = true;

        const tick = async () => {
            if (!trackLoopActiveRef.current) {
                return;
            }

            await runTrackFrame();

            if (!trackLoopActiveRef.current) {
                return;
            }

            trackTimeoutRef.current = setTimeout(tick, FACE_TRACK_MIN_INTERVAL_MS);
        };

        void tick();
    }, [runTrackFrame, stopTrackLoop]);

    const runDescriptorFrame = useCallback(async () => {
        if (!modelsReady || phase === 'submitting' || !isActive) {
            return;
        }

        const dataUrl = await captureSnapshot(FACE_DESCRIPTOR_SNAPSHOT_QUALITY);

        if (dataUrl) {
            processorRef.current?.processSnapshot(dataUrl);
        }
    }, [captureSnapshot, isActive, modelsReady, phase]);

    const handleDescriptor = useCallback(
        (descriptor: number[]) => {
            if (mode === 'verify') {
                stopEnrollLoop();
                setPhase('submitting');
                onScanningChange?.(true);
                setStatusText('Verifying…');
                onVerifyComplete(descriptor);

                return;
            }

            const nextScans = [...collectedScans, descriptor];
            setCollectedScans(nextScans);
            const nextIndex = enrollIndex + 1;
            setEnrollIndex(nextIndex);

            if (nextIndex >= ENROLLMENT_SCAN_COUNT) {
                stopEnrollLoop();
                setPhase('submitting');
                onScanningChange?.(true);
                setStatusText('Saving…');
                onEnrollmentComplete(averageEmbeddings(nextScans));

                return;
            }

            setFlashColor(ENROLLMENT_FLASH_COLORS[nextIndex] ?? null);
            setStatusText(`Scan ${nextIndex + 1} of ${ENROLLMENT_SCAN_COUNT}`);
        },
        [
            collectedScans,
            enrollIndex,
            mode,
            onEnrollmentComplete,
            onScanningChange,
            onVerifyComplete,
            stopEnrollLoop,
        ],
    );

    const handleWebViewMessage = useCallback(
        (message: FaceWebViewMessage) => {
            if (message.type === 'models_loaded') {
                setModelsReady(true);
                setStatusText(
                    mode === 'enroll'
                        ? 'Position your face in the box'
                        : 'Face the camera',
                );

                return;
            }

            if (message.type === 'face_box') {
                if (
                    typeof message.box?.x !== 'number' ||
                    typeof message.box?.y !== 'number'
                ) {
                    return;
                }

                faceVisibleRef.current = true;
                setFaceBox((previous) => smoothBox(previous, message.box));

                const detectionScore =
                    typeof message.box.score === 'number'
                        ? message.box.score
                        : null;

                if (
                    mode === 'verify' &&
                    autoVerify &&
                    detectionScore !== null &&
                    detectionScore < FACE_VERIFY_MIN_BOX_SCORE
                ) {
                    stableFaceFramesRef.current = 0;
                    setStatusText('Move closer and face the camera');
                    return;
                }

                setStatusText(
                    mode === 'enroll'
                        ? `Scan ${Math.min(enrollIndex + 1, ENROLLMENT_SCAN_COUNT)} of ${ENROLLMENT_SCAN_COUNT}`
                        : verifyPaused && statusHint
                          ? statusHint
                          : autoVerify
                            ? 'Face detected'
                            : 'Face detected',
                );

                if (mode === 'verify' && autoVerify && !verifyPaused) {
                    stableFaceFramesRef.current += 1;

                    if (stableFaceFramesRef.current >= FACE_VERIFY_STABLE_FRAMES) {
                        scheduleAutoVerifyCapture();
                    }
                }

                return;
            }

            if (message.type === 'descriptor') {
                handleDescriptor(message.descriptor);

                return;
            }

            if (message.type === 'no_face') {
                faceVisibleRef.current = false;
                stableFaceFramesRef.current = 0;
                verifyAttemptInProgressRef.current = false;
                clearVerifyDebounce();
                setFaceBox(null);

                if (message.message) {
                    setPhase('idle');
                    onScanningChange?.(false);
                    setStatusText(
                        autoVerify && mode === 'verify'
                            ? 'Looking for your face…'
                            : message.message,
                    );

                    if (mode === 'verify' && !autoVerify) {
                        onError(message.message);
                    }
                } else {
                    setStatusText('Looking for your face…');
                }

                return;
            }

            if (message.type === 'error') {
                verifyAttemptInProgressRef.current = false;
                setPhase('idle');
                onScanningChange?.(false);
                onError(message.message);
            }
        },
        [enrollIndex, autoVerify, clearVerifyDebounce, handleDescriptor, mode, onError, onScanningChange, scheduleAutoVerifyCapture, statusHint, verifyPaused],
    );

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;

        if (width > 0) {
            setPreviewWidth(width);
            console.log('Camera preview layout width', width);
        }
    }, []);

    useEffect(() => {
        if (!isSubmitting && phase === 'submitting') {
            verifyAttemptInProgressRef.current = false;
            stableFaceFramesRef.current = 0;
            setPhase(modelsReady ? 'idle' : 'loading_models');
            onScanningChange?.(false);
        }
    }, [isSubmitting, modelsReady, onScanningChange, phase]);

    useEffect(() => {
        if (!isActive) {
            stopTrackLoop();
            stopEnrollLoop();
            stopAutoVerifyLoop();
            clearVerifyDebounce();
            verifyAttemptInProgressRef.current = false;
            stableFaceFramesRef.current = 0;
            lastTrackDataUrlRef.current = null;
            setPhase('idle');
            setFaceBox(null);
            setCameraInitialized(false);
            setPreviewStarted(false);
            onScanningChange?.(false);

            return;
        }

        if (!hasPermission) {
            requestPermission();
        }
    }, [
        hasPermission,
        isActive,
        onScanningChange,
        requestPermission,
        stopEnrollLoop,
        stopAutoVerifyLoop,
        clearVerifyDebounce,
        stopTrackLoop,
    ]);

    useEffect(() => {
        if (
            !isActive ||
            !modelsReady ||
            !captureReady ||
            phase === 'submitting' ||
            (mode === 'verify' && phase === 'scanning' && !autoVerify)
        ) {
            stopTrackLoop();

            return;
        }

        startTrackLoop();

        return stopTrackLoop;
    }, [
        autoVerify,
        captureReady,
        isActive,
        mode,
        modelsReady,
        phase,
        startTrackLoop,
        stopTrackLoop,
    ]);

    useEffect(() => {
        if (
            !isActive ||
            !modelsReady ||
            mode !== 'enroll' ||
            phase === 'submitting'
        ) {
            stopEnrollLoop();

            return;
        }

        setPhase('scanning');
        setFlashColor(ENROLLMENT_FLASH_COLORS[0]);
        enrollIntervalRef.current = setInterval(() => {
            if (faceVisibleRef.current) {
                runDescriptorFrame();
            }
        }, FACE_ENROLL_DESCRIPTOR_INTERVAL_MS);

        return stopEnrollLoop;
    }, [
        isActive,
        mode,
        modelsReady,
        phase,
        runDescriptorFrame,
        stopEnrollLoop,
    ]);

    useEffect(() => {
        if (
            !isActive ||
            !modelsReady ||
            mode !== 'verify' ||
            !autoVerify ||
            verifyPaused ||
            phase === 'submitting'
        ) {
            stopAutoVerifyLoop();

            if (verifyPaused && statusHint && mode === 'verify' && autoVerify) {
                setStatusText(statusHint);
            }

            return;
        }

        setPhase('scanning');
        setStatusText('Looking for your face…');
        autoVerifyIntervalRef.current = setInterval(() => {
            if (
                faceVisibleRef.current &&
                stableFaceFramesRef.current >= FACE_VERIFY_STABLE_FRAMES
            ) {
                runAutoVerifyCapture();
            }
        }, FACE_AUTO_VERIFY_DESCRIPTOR_INTERVAL_MS);

        return stopAutoVerifyLoop;
    }, [
        autoVerify,
        isActive,
        mode,
        modelsReady,
        phase,
        runAutoVerifyCapture,
        statusHint,
        stopAutoVerifyLoop,
        verifyPaused,
    ]);

    useEffect(() => {
        if (
            mode !== 'verify' ||
            autoVerify ||
            !isActive ||
            !modelsReady ||
            !captureReady ||
            scanRequestId === 0 ||
            phase === 'submitting'
        ) {
            return;
        }

        setPhase('scanning');
        setStatusText('Scanning…');
        runDescriptorFrame();
    }, [
        captureReady,
        isActive,
        mode,
        modelsReady,
        phase,
        runDescriptorFrame,
        scanRequestId,
    ]);

    useEffect(() => {
        if (verifyPaused && statusHint && mode === 'verify' && autoVerify && phase !== 'submitting') {
            setStatusText(statusHint);
        }
    }, [autoVerify, mode, phase, statusHint, verifyPaused]);

    if (!hasPermission) {
        return (
            <View style={styles.permissionBox}>
                <Text style={styles.permissionText}>
                    Camera access is required for facial recognition.
                </Text>
                <Pressable
                    style={styles.permissionButton}
                    onPress={requestPermission}
                >
                    <Text style={styles.permissionButtonText}>Allow camera</Text>
                </Pressable>
            </View>
        );
    }

    if (!device) {
        return (
            <View style={styles.permissionBox}>
                <ActivityIndicator color={colors.brand} />
                <Text style={styles.permissionText}>Starting front camera…</Text>
            </View>
        );
    }

    const cameraStyle =
        previewWidth > 0
            ? { width: previewWidth, height: PREVIEW_HEIGHT }
            : { width: '100%' as const, height: PREVIEW_HEIGHT };

    return (
        <View
            style={styles.wrap}
            onLayout={handleLayout}
            collapsable={false}
        >
            {previewWidth > 0 ? (
                <Camera
                    key={device.id}
                    ref={cameraRef}
                    style={cameraStyle}
                    device={device}
                    isActive={isActive}
                    onInitialized={() => {
                        console.log('Camera initialized', device.id);
                        setCameraInitialized(true);
                        setStatusText('Starting preview…');
                    }}
                    onPreviewStarted={() => {
                        console.log('Camera preview started');
                        setPreviewStarted(true);
                        setStatusText(
                            modelsReady
                                ? mode === 'enroll'
                                    ? 'Position your face in the box'
                                    : autoVerify
                                      ? verifyPaused && statusHint
                                          ? statusHint
                                          : 'Face the camera to time in or out'
                                      : 'Face the camera'
                                : 'Loading face models…',
                        );
                    }}
                    onPreviewStopped={() => {
                        console.log('Camera preview stopped');
                        setPreviewStarted(false);
                    }}
                    onError={(error) => {
                        console.log('Camera runtime error', error);
                        setCameraInitialized(false);
                        setPreviewStarted(false);
                        onError(
                            'Camera could not start. Fully close the app and open Time again.',
                        );
                    }}
                />
            ) : (
                <View style={[styles.placeholder, cameraStyle]} />
            )}

            {flashColor ? (
                <View
                    pointerEvents="none"
                    style={[styles.flashOverlay, cameraStyle]}
                />
            ) : null}

            {faceBox && previewWidth > 0 ? (
                <FaceTrackingBox
                    box={faceBox}
                    layoutWidth={previewWidth}
                    layoutHeight={PREVIEW_HEIGHT}
                    mirrorX
                />
            ) : null}

            <View style={styles.statusBar} pointerEvents="none">
                {!modelsReady ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : null}
                <Text style={styles.statusText}>
                    {statusHint && verifyPaused && mode === 'verify' && autoVerify
                        ? statusHint
                        : statusText}
                </Text>
            </View>

            <FaceProcessorWebView
                ref={processorRef}
                onMessage={handleWebViewMessage}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        height: PREVIEW_HEIGHT,
        width: '100%',
        borderRadius: 14,
        backgroundColor: '#0f172a',
    },
    placeholder: {
        backgroundColor: '#0f172a',
    },
    flashOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.3,
    },
    statusBar: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(15,23,42,0.72)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    statusText: {
        flex: 1,
        color: '#fff',
        fontSize: 13,
        lineHeight: 18,
    },
    permissionBox: {
        height: PREVIEW_HEIGHT,
        borderRadius: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        gap: 12,
    },
    permissionText: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
    permissionButton: {
        backgroundColor: colors.brand,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    permissionButtonText: {
        color: colors.brandForeground,
        fontWeight: '600',
    },
});
