import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    LayoutChangeEvent,
    Platform,
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

    const blend = 0.4;

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
    const isAndroid = Platform.OS === 'android';
    const cameraRef = useRef<Camera>(null);
    const processorRef = useRef<FaceProcessorHandle>(null);
    const trackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const enrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const capturingRef = useRef(false);
    const faceVisibleRef = useRef(false);

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
    const [processorMounted, setProcessorMounted] = useState(false);

    const captureReady =
        cameraInitialized &&
        previewStarted &&
        previewWidth > 0;

    const stopTrackLoop = useCallback(() => {
        if (trackIntervalRef.current) {
            clearInterval(trackIntervalRef.current);
            trackIntervalRef.current = null;
        }
    }, []);

    const stopEnrollLoop = useCallback(() => {
        if (enrollIntervalRef.current) {
            clearInterval(enrollIntervalRef.current);
            enrollIntervalRef.current = null;
        }
    }, []);

    const captureSnapshot = useCallback(async (): Promise<string | null> => {
        if (!cameraRef.current || capturingRef.current || !captureReady) {
            return null;
        }

        capturingRef.current = true;

        try {
            const photo = await cameraRef.current.takeSnapshot({
                quality: 70,
            });
            const path = photo.path.replace('file://', '');
            const base64 = await ReactNativeBlobUtil.fs.readFile(path, 'base64');

            return `data:image/jpeg;base64,${base64}`;
        } catch (error) {
            console.log('Frame capture failed', error);

            return null;
        } finally {
            capturingRef.current = false;
        }
    }, [captureReady]);

    const runTrackFrame = useCallback(async () => {
        if (!modelsReady || phase === 'submitting' || !isActive || !processorMounted) {
            return;
        }

        const dataUrl = await captureSnapshot();

        if (dataUrl) {
            processorRef.current?.trackSnapshot(dataUrl);
        }
    }, [captureSnapshot, isActive, modelsReady, phase, processorMounted]);

    const runDescriptorFrame = useCallback(async () => {
        if (!modelsReady || phase === 'submitting' || !isActive || !processorMounted) {
            return;
        }

        const dataUrl = await captureSnapshot();

        if (dataUrl) {
            processorRef.current?.processSnapshot(dataUrl);
        }
    }, [captureSnapshot, isActive, modelsReady, phase, processorMounted]);

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
                setStatusText(
                    mode === 'enroll'
                        ? `Scan ${Math.min(enrollIndex + 1, ENROLLMENT_SCAN_COUNT)} of ${ENROLLMENT_SCAN_COUNT}`
                        : 'Face detected',
                );

                return;
            }

            if (message.type === 'descriptor') {
                handleDescriptor(message.descriptor);

                return;
            }

            if (message.type === 'no_face') {
                faceVisibleRef.current = false;
                setFaceBox(null);
                setPhase('idle');
                onScanningChange?.(false);
                setStatusText(
                    message.message ?? 'Looking for your face…',
                );

                if (message.message && mode === 'verify') {
                    onError(message.message);
                }

                return;
            }

            if (message.type === 'error') {
                setPhase('idle');
                onScanningChange?.(false);
                onError(message.message);
            }
        },
        [enrollIndex, handleDescriptor, mode, onError, onScanningChange],
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
            setPhase(modelsReady ? 'idle' : 'loading_models');
            onScanningChange?.(false);
        }
    }, [isSubmitting, modelsReady, onScanningChange, phase]);

    useEffect(() => {
        if (!isActive) {
            stopTrackLoop();
            stopEnrollLoop();
            setPhase('idle');
            setFaceBox(null);
            setCameraInitialized(false);
            setPreviewStarted(false);
            setProcessorMounted(false);
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
        stopTrackLoop,
    ]);

    useEffect(() => {
        if (!isActive || !modelsReady || !captureReady || phase === 'submitting') {
            stopTrackLoop();

            return;
        }

        runTrackFrame();
        trackIntervalRef.current = setInterval(runTrackFrame, isAndroid ? 600 : 450);

        return stopTrackLoop;
    }, [
        captureReady,
        isActive,
        isAndroid,
        modelsReady,
        phase,
        processorMounted,
        runTrackFrame,
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
        }, 1200);

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
            mode !== 'verify' ||
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
                        setProcessorMounted(true);
                        setStatusText(
                            modelsReady
                                ? mode === 'enroll'
                                    ? 'Position your face in the box'
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
                <Text style={styles.statusText}>{statusText}</Text>
            </View>

            {processorMounted ? (
                <FaceProcessorWebView
                    ref={processorRef}
                    onMessage={handleWebViewMessage}
                />
            ) : null}
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
