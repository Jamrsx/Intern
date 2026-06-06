import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {
    enrollInternFace,
    fetchInternTimeStatus,
    punchInternTime,
} from '../api/time';
import { ApiError } from '../api/client';
import { EmbeddedFaceScanner } from '../components/EmbeddedFaceScanner';
import { PUNCH_COOLDOWN_MS } from '../constants/face';
import { euclideanDistance, faceMatches } from '../face/faceMatcher';
import {
    getEnrolledFaceEmbedding,
    saveEnrolledFaceEmbedding,
} from '../storage/faceEmbeddingStorage';
import { colors } from '../theme/colors';
import type { StoredSession } from '../types/auth';
import type { InternTimeStatusResponse, TimeLogSegment } from '../types/time';

type Props = {
    session: StoredSession;
};

function formatClock(value: string | null): string {
    if (!value) {
        return '';
    }

    return new Date(value).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatDurationMinutes(minutes: number): string {
    const total = Math.max(0, Math.round(minutes));
    const hours = Math.floor(total / 60);
    const mins = total % 60;

    if (hours === 0) {
        return `${mins} min`;
    }

    if (mins === 0) {
        return `${hours} hr`;
    }

    return `${hours} hr ${mins} min`;
}

function formatCooldown(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function FeedbackBanner({
    message,
    tone,
}: {
    message: string;
    tone: 'error' | 'success';
}) {
    return (
        <View
            style={[
                styles.feedback,
                tone === 'error' ? styles.feedbackError : styles.feedbackSuccess,
            ]}
        >
            <Text
                style={
                    tone === 'error'
                        ? styles.feedbackErrorText
                        : styles.feedbackSuccessText
                }
            >
                {message}
            </Text>
        </View>
    );
}

function StatusHeader({
    todayMinutes,
    isTimedIn,
    timeInLabel,
    showSession,
    lunchHint,
}: {
    todayMinutes: number;
    isTimedIn: boolean;
    timeInLabel: string;
    showSession: boolean;
    lunchHint: string | null;
}) {
    return (
        <View style={styles.statusHeader}>
            <Text style={styles.todayValue}>
                {formatDurationMinutes(todayMinutes)}
            </Text>
            <Text style={styles.todayCaption}>logged today</Text>
            {showSession ? (
                <View style={styles.sessionRow}>
                    {isTimedIn ? <View style={styles.sessionDot} /> : null}
                    <Text style={styles.sessionText}>
                        {lunchHint ??
                            (isTimedIn
                                ? `Timed in since ${timeInLabel}`
                                : 'Not timed in')}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

function SegmentRow({ segment }: { segment: TimeLogSegment }) {
    const duration = segment.is_open
        ? 'Active'
        : segment.duration_minutes !== null
          ? formatDurationMinutes(segment.duration_minutes)
          : '';

    return (
        <View style={styles.segmentRow}>
            <Text style={styles.segmentTime}>
                {formatClock(segment.time_in)}
                {segment.time_out
                    ? ` – ${formatClock(segment.time_out)}`
                    : ' – now'}
            </Text>
            <Text
                style={[
                    styles.segmentDuration,
                    segment.is_open && styles.segmentDurationActive,
                ]}
            >
                {duration}
            </Text>
        </View>
    );
}

export function TimeScreen({ session }: Props) {
    const [status, setStatus] = useState<InternTimeStatusResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isWorking, setIsWorking] = useState(false);
    const [feedback, setFeedback] = useState<{
        message: string;
        tone: 'error' | 'success';
    } | null>(null);
    const [enrollStep, setEnrollStep] = useState<'intro' | 'scanning'>('intro');
    const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);
    const punchCooldownUntilRef = useRef(0);
    const punchInFlightRef = useRef(false);
    const statusRef = useRef<InternTimeStatusResponse | null>(null);
    const enrolledEmbeddingRef = useRef<number[] | null>(null);
    const userId = session.user.id;

    const syncEnrolledEmbedding = useCallback(
        async (embedding: number[] | null | undefined) => {
            if (embedding && embedding.length === 128) {
                enrolledEmbeddingRef.current = embedding;
                await saveEnrolledFaceEmbedding(userId, embedding);
                return;
            }

            const stored = await getEnrolledFaceEmbedding(userId);
            enrolledEmbeddingRef.current = stored;
        },
        [userId],
    );

    const loadStatus = useCallback(async () => {
        try {
            const response = await fetchInternTimeStatus(session.accessToken);
            setStatus(response);
            statusRef.current = response;

            if (response.face_enrolled) {
                await syncEnrolledEmbedding(response.face_embedding);
            } else {
                enrolledEmbeddingRef.current = null;
            }

            console.log('Time screen status refreshed', {
                canPunchIn: response.can_punch_in,
                canPunchOut: response.can_punch_out,
                hasLocalEmbedding: enrolledEmbeddingRef.current !== null,
            });
        } catch (error) {
            const message =
                error instanceof ApiError
                    ? error.message
                    : 'Could not load your time status.';
            setFeedback({ message, tone: 'error' });
            console.log('Time status load failed', error);
        } finally {
            setIsLoading(false);
        }
    }, [session.accessToken, syncEnrolledEmbedding]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const secondsLeft = Math.max(
                0,
                Math.ceil((punchCooldownUntilRef.current - Date.now()) / 1000),
            );
            setCooldownSecondsLeft((previous) =>
                previous === secondsLeft ? previous : secondsLeft,
            );
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    const startPunchCooldown = useCallback(() => {
        punchCooldownUntilRef.current = Date.now() + PUNCH_COOLDOWN_MS;
        setCooldownSecondsLeft(Math.ceil(PUNCH_COOLDOWN_MS / 1000));
        console.log('Punch cooldown started', {
            minutes: PUNCH_COOLDOWN_MS / 60000,
        });
    }, []);

    const handleEnrollmentComplete = useCallback(
        async (embedding: number[]) => {
            setIsWorking(true);
            setFeedback(null);

            try {
                const result = await enrollInternFace(
                    session.accessToken,
                    embedding,
                );
                setFeedback({ message: result.message, tone: 'success' });
                enrolledEmbeddingRef.current = embedding;
                await saveEnrolledFaceEmbedding(userId, embedding);
                setEnrollStep('intro');
                await loadStatus();
            } catch (error) {
                const message =
                    error instanceof ApiError
                        ? error.message
                        : 'Face setup failed. Try again.';
                setFeedback({ message, tone: 'error' });
            } finally {
                setIsWorking(false);
            }
        },
        [loadStatus, session.accessToken, userId],
    );

    const rejectFaceMatch = useCallback((distance: number | null) => {
        console.log('Face match rejected', { distance });
        setFeedback({
            message: 'Face not recognized. Only the enrolled student can time in or out.',
            tone: 'error',
        });
        setIsWorking(false);
    }, []);

    const handleVerifyComplete = useCallback(
        async (embedding: number[], action: 'time_in' | 'time_out') => {
            if (punchInFlightRef.current) {
                return;
            }

            punchInFlightRef.current = true;
            setIsWorking(true);
            setFeedback(null);

            try {
                const result = await punchInternTime(
                    session.accessToken,
                    action,
                    embedding,
                    `${Platform.OS} ${Platform.Version}`,
                );
                setFeedback({ message: result.message, tone: 'success' });
                startPunchCooldown();
                void loadStatus();
            } catch (error) {
                const message =
                    error instanceof ApiError
                        ? error.message
                        : 'Could not record your time. Try again.';
                setFeedback({ message, tone: 'error' });
            } finally {
                punchInFlightRef.current = false;
                setIsWorking(false);
            }
        },
        [loadStatus, session.accessToken, startPunchCooldown],
    );

    const handleAutoVerifyComplete = useCallback(
        (embedding: number[]) => {
            if (punchInFlightRef.current) {
                return;
            }

            if (Date.now() < punchCooldownUntilRef.current) {
                console.log('Auto punch skipped — cooldown active');
                setIsWorking(false);
                return;
            }

            const enrolled = enrolledEmbeddingRef.current;

            if (!enrolled) {
                console.log('Auto punch blocked — no enrolled embedding on device');
                setFeedback({
                    message:
                        'Face profile is missing on this device. Open Time again or re-enroll your face.',
                    tone: 'error',
                });
                setIsWorking(false);
                return;
            }

            const distance = euclideanDistance(enrolled, embedding);

            if (!faceMatches(enrolled, embedding)) {
                rejectFaceMatch(distance);
                return;
            }

            const currentStatus = statusRef.current;
            const action = currentStatus?.can_punch_out
                ? 'time_out'
                : currentStatus?.can_punch_in
                  ? 'time_in'
                  : null;

            if (!action) {
                console.log('Auto punch skipped — no punch action available');
                setIsWorking(false);
                return;
            }

            console.log('Auto punch triggered', { action, distance });
            void handleVerifyComplete(embedding, action);
        },
        [handleVerifyComplete, rejectFaceMatch],
    );

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.brand} />
            </View>
        );
    }

    const faceEnrolled = status?.face_enrolled ?? false;
    const isTimedIn = Boolean(status?.open_log);
    const todayMinutes = status?.today_minutes ?? 0;
    const segments = status?.today_segments ?? [];
    const timeInLabel = formatClock(status?.open_log?.time_in ?? null);
    const lunchHint =
        !isTimedIn &&
        status &&
        !status.can_punch_in &&
        status.lunch_notice &&
        !status.lunch_notice.can_time_in_now
            ? `Lunch break · back at ${status.lunch_break?.afternoon_start_label ?? '1:00 PM'}`
            : null;
    const cooldownHint =
        cooldownSecondsLeft > 0
            ? `Next scan in ${formatCooldown(cooldownSecondsLeft)}`
            : null;
    const scannerStatusHint =
        cooldownHint ??
        (isWorking ? 'Recording time…' : lunchHint);
    const verifyPaused =
        isWorking ||
        cooldownSecondsLeft > 0 ||
        (!status?.can_punch_in && !status?.can_punch_out);

    return (
        <View style={styles.page}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <StatusHeader
                    todayMinutes={todayMinutes}
                    isTimedIn={isTimedIn}
                    timeInLabel={timeInLabel}
                    showSession={faceEnrolled}
                    lunchHint={cooldownHint ?? lunchHint}
                />

                {feedback ? (
                    <FeedbackBanner
                        message={feedback.message}
                        tone={feedback.tone}
                    />
                ) : null}

                {!faceEnrolled ? (
                    <View style={styles.setupBlock}>
                        {enrollStep === 'intro' ? (
                            <>
                                <Text style={styles.setupTitle}>
                                    Face setup required
                                </Text>
                                <Text style={styles.setupText}>
                                    Scan your face once. After that, time in and
                                    out happen automatically when your face is
                                    detected.
                                </Text>
                                <Pressable
                                    style={styles.primaryButton}
                                    onPress={() => setEnrollStep('scanning')}
                                >
                                    <Text style={styles.primaryButtonText}>
                                        Set up face
                                    </Text>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <EmbeddedFaceScanner
                                    isActive
                                    mode="enroll"
                                    isSubmitting={isWorking}
                                    onEnrollmentComplete={
                                        handleEnrollmentComplete
                                    }
                                    onVerifyComplete={() => {}}
                                    onError={(message) =>
                                        setFeedback({
                                            message,
                                            tone: 'error',
                                        })
                                    }
                                    onScanningChange={setIsWorking}
                                />
                                <Pressable
                                    style={styles.textButton}
                                    onPress={() => setEnrollStep('intro')}
                                    disabled={isWorking}
                                >
                                    <Text style={styles.textButtonLabel}>
                                        Cancel
                                    </Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                ) : (
                    <View style={styles.mainBlock}>
                        <EmbeddedFaceScanner
                            isActive
                            mode="verify"
                            autoVerify
                            verifyPaused={verifyPaused}
                            statusHint={scannerStatusHint}
                            isSubmitting={isWorking}
                            onEnrollmentComplete={() => {}}
                            onVerifyComplete={handleAutoVerifyComplete}
                            onError={(message) =>
                                setFeedback({ message, tone: 'error' })
                            }
                            onScanningChange={setIsWorking}
                        />

                        {segments.length > 0 ? (
                            <View style={styles.logCard}>
                                <Text style={styles.logTitle}>Today</Text>
                                {segments.map((segment, index) => (
                                    <View key={segment.id}>
                                        <SegmentRow segment={segment} />
                                        {index < segments.length - 1 ? (
                                            <View style={styles.segmentDivider} />
                                        ) : null}
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 32,
        gap: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusHeader: {
        alignItems: 'center',
        paddingVertical: 8,
        gap: 4,
    },
    todayValue: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.5,
    },
    todayCaption: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textMuted,
    },
    sessionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    sessionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
    },
    sessionText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textMuted,
        textAlign: 'center',
    },
    feedback: {
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    feedbackError: {
        backgroundColor: colors.errorBackground,
    },
    feedbackSuccess: {
        backgroundColor: '#ECFDF5',
    },
    feedbackErrorText: {
        color: colors.error,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    feedbackSuccessText: {
        color: colors.success,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    setupBlock: {
        gap: 14,
    },
    setupTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    setupText: {
        fontSize: 14,
        lineHeight: 21,
        color: colors.textMuted,
        textAlign: 'center',
    },
    mainBlock: {
        gap: 16,
    },
    primaryButton: {
        backgroundColor: colors.brand,
        borderRadius: 14,
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: colors.brandForeground,
        fontSize: 16,
        fontWeight: '600',
    },
    textButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    textButtonLabel: {
        fontSize: 15,
        color: colors.textMuted,
        fontWeight: '500',
    },
    logCard: {
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 4,
    },
    logTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 4,
    },
    segmentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    segmentTime: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        marginRight: 12,
    },
    segmentDuration: {
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: '600',
    },
    segmentDurationActive: {
        color: colors.success,
    },
    segmentDivider: {
        height: 1,
        backgroundColor: colors.border,
    },
});
