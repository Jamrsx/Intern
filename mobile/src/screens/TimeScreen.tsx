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

function formatTodayHours(minutes: number): string {
    const hours = minutes / 60;

    return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
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
                    tone === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText
                }
            >
                {message}
            </Text>
        </View>
    );
}

function SegmentRow({ segment }: { segment: TimeLogSegment }) {
    return (
        <View style={styles.segmentRow}>
            <Text style={styles.segmentTime}>
                {formatClock(segment.time_in)}
                {segment.time_out ? ` – ${formatClock(segment.time_out)}` : ' – …'}
            </Text>
            <Text style={styles.segmentDuration}>
                {segment.is_open ? 'Active' : formatSegmentDuration(segment.duration_minutes)}
            </Text>
        </View>
    );
}

function formatSegmentDuration(minutes: number | null): string {
    if (minutes === null) {
        return '';
    }

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h === 0) {
        return `${m}m`;
    }

    return `${h}h ${m}m`;
}

export function TimeScreen({ session }: Props) {
    const [status, setStatus] = useState<InternTimeStatusResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isWorking, setIsWorking] = useState(false);
    const [feedback, setFeedback] = useState<{
        message: string;
        tone: 'error' | 'success';
    } | null>(null);
    const [scanRequestId, setScanRequestId] = useState(0);
    const [enrollStep, setEnrollStep] = useState<'intro' | 'scanning'>('intro');
    const pendingPunchRef = useRef<'time_in' | 'time_out' | null>(null);

    const loadStatus = useCallback(async () => {
        try {
            const response = await fetchInternTimeStatus(session.accessToken);
            setStatus(response);
            console.log('Time screen status refreshed', response);
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
    }, [session.accessToken]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

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
        [loadStatus, session.accessToken],
    );

    const handleVerifyComplete = useCallback(
        async (embedding: number[], action: 'time_in' | 'time_out') => {
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
                await loadStatus();
            } catch (error) {
                const message =
                    error instanceof ApiError
                        ? error.message
                        : 'Could not record your time. Try again.';
                setFeedback({ message, tone: 'error' });
            } finally {
                setIsWorking(false);
            }
        },
        [loadStatus, session.accessToken],
    );

    const requestPunchScan = useCallback(
        (action: 'time_in' | 'time_out') => {
            if (isWorking) {
                return;
            }

            console.log('Time punch requested', { action });
            pendingPunchRef.current = action;
            setScanRequestId((value) => value + 1);
        },
        [isWorking],
    );

    const handleVerifyFromScanner = useCallback(
        (embedding: number[]) => {
            const pending = pendingPunchRef.current;
            if (!pending) {
                return;
            }
            pendingPunchRef.current = null;
            handleVerifyComplete(embedding, pending);
        },
        [handleVerifyComplete],
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

    const sessionHint = isTimedIn
        ? `Timed in since ${formatClock(status?.open_log?.time_in ?? null)}`
        : 'You are not timed in';

    return (
        <View style={styles.page}>
            <View style={styles.fixedSection}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Time</Text>
                    <View style={styles.todayPill}>
                        <Text style={styles.todayPillText}>
                            {formatTodayHours(todayMinutes)}h today
                        </Text>
                    </View>
                </View>

                {feedback ? (
                    <FeedbackBanner
                        message={feedback.message}
                        tone={feedback.tone}
                    />
                ) : null}

                {!faceEnrolled ? (
                    <View style={styles.block}>
                        {enrollStep === 'intro' ? (
                            <>
                                <Text style={styles.lead}>
                                    Set up your face once. After that, use Time in
                                    and Time out below.
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
                                    onEnrollmentComplete={handleEnrollmentComplete}
                                    onVerifyComplete={() => {}}
                                    onError={(message) =>
                                        setFeedback({ message, tone: 'error' })
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
                    <>
                        <Text style={styles.sessionHint}>{sessionHint}</Text>

                        <EmbeddedFaceScanner
                            isActive
                            mode="verify"
                            scanRequestId={scanRequestId}
                            isSubmitting={isWorking}
                            onEnrollmentComplete={() => {}}
                            onVerifyComplete={handleVerifyFromScanner}
                            onError={(message) =>
                                setFeedback({ message, tone: 'error' })
                            }
                            onScanningChange={setIsWorking}
                        />

                        <Text style={styles.scanHint}>
                            {isWorking
                                ? 'Hold still…'
                                : 'Keep your face in the blue box, then tap a button'}
                        </Text>

                        <View style={styles.punchRow}>
                            <Pressable
                                disabled={isWorking || !status?.can_punch_in}
                                style={[
                                    styles.punchButton,
                                    styles.punchIn,
                                    (isWorking || !status?.can_punch_in) &&
                                        styles.buttonDisabled,
                                ]}
                                onPress={() => requestPunchScan('time_in')}
                            >
                                <Text style={styles.punchInText}>Time in</Text>
                            </Pressable>
                            <Pressable
                                disabled={isWorking || !status?.can_punch_out}
                                style={[
                                    styles.punchButton,
                                    styles.punchOut,
                                    (isWorking || !status?.can_punch_out) &&
                                        styles.buttonDisabled,
                                ]}
                                onPress={() => requestPunchScan('time_out')}
                            >
                                <Text style={styles.punchOutText}>Time out</Text>
                            </Pressable>
                        </View>
                    </>
                )}
            </View>

            {faceEnrolled && segments.length > 0 ? (
                <ScrollView
                    style={styles.logScroll}
                    contentContainerStyle={styles.logScrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.logBlock}>
                        <Text style={styles.logTitle}>Today</Text>
                        {segments.map((segment) => (
                            <SegmentRow key={segment.id} segment={segment} />
                        ))}
                    </View>
                </ScrollView>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    fixedSection: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 14,
        gap: 14,
    },
    logScroll: {
        flex: 1,
    },
    logScrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 28,
    },
    screen: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 28,
        gap: 14,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    todayPill: {
        backgroundColor: colors.brandMuted,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    todayPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.brand,
    },
    feedback: {
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
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
    },
    feedbackSuccessText: {
        color: colors.success,
        fontSize: 14,
        lineHeight: 20,
    },
    block: {
        gap: 14,
    },
    lead: {
        fontSize: 15,
        lineHeight: 22,
        color: colors.textMuted,
    },
    sessionHint: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    scanHint: {
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
    },
    punchRow: {
        flexDirection: 'row',
        gap: 12,
    },
    punchButton: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    punchIn: {
        backgroundColor: colors.brand,
    },
    punchOut: {
        backgroundColor: colors.background,
        borderWidth: 2,
        borderColor: colors.brand,
    },
    punchInText: {
        color: colors.brandForeground,
        fontSize: 17,
        fontWeight: '700',
    },
    punchOutText: {
        color: colors.brand,
        fontSize: 17,
        fontWeight: '700',
    },
    primaryButton: {
        backgroundColor: colors.brand,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
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
    buttonDisabled: {
        opacity: 0.45,
    },
    logBlock: {
        marginTop: 4,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 8,
    },
    logTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    segmentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    segmentTime: {
        fontSize: 15,
        color: colors.text,
    },
    segmentDuration: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '500',
    },
});
