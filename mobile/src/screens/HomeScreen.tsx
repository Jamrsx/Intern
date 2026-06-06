import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { fetchInternProgress } from '../api/intern';
import { fetchInternDocumentRequirements } from '../api/documents';
import { fetchInternTimeLogs } from '../api/time';
import { ApiError } from '../api/client';
import { DocumentAlertsBell } from '../components/DocumentAlertsBell';
import { DocumentAlertsModal } from '../components/DocumentAlertsModal';
import { TimeRecordsModal } from '../components/TimeRecordsModal';
import {
    mapNotificationItems,
    resolveDocsBadgeCount,
} from '../services/documentAlerts';
import { colors } from '../theme/colors';
import type { StoredSession } from '../types/auth';
import type { DocumentNotificationItem } from '../types/documents';
import type { InternProgressResponse } from '../types/intern';
import type { TimeLogSegment } from '../types/time';

type Props = {
    session: StoredSession;
    documentAlertCount?: number;
    onAcknowledgeSeen?: () => Promise<void>;
    onAlertsRefresh?: () => Promise<void>;
    onGoToDocuments?: () => void;
};

function formatHours(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDate(dateString: string): string {
    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function getTentativeEndCaption(
    progress: InternProgressResponse['progress'],
): string {
    if (progress.estimated_end_basis === 'completed') {
        return 'Required hours completed';
    }

    if (progress.estimated_end_is_approximate) {
        return 'Approximate · based on 8 hrs/day, 5 days/week';
    }

    if (progress.schedule) {
        return `Approximate · ${progress.schedule.hours_per_day} hrs/day, ${progress.schedule.days_per_week} days/week`;
    }

    return 'Approximate · based on your OJT schedule';
}

export function HomeScreen({
    session,
    documentAlertCount = 0,
    onAcknowledgeSeen,
    onAlertsRefresh,
    onGoToDocuments,
}: Props) {
    const [data, setData] = useState<InternProgressResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<
        DocumentNotificationItem[]
    >([]);
    const [showAlertsModal, setShowAlertsModal] = useState(false);
    const [showTimeRecordsModal, setShowTimeRecordsModal] = useState(false);
    const [timeLogs, setTimeLogs] = useState<TimeLogSegment[]>([]);
    const [timeLogsTotal, setTimeLogsTotal] = useState(0);
    const [isLoadingTimeLogs, setIsLoadingTimeLogs] = useState(false);
    const [timeLogsError, setTimeLogsError] = useState<string | null>(null);

    const loadDocumentAlerts = useCallback(async () => {
        try {
            const response = await fetchInternDocumentRequirements(
                session.accessToken,
            );

            setNotifications(mapNotificationItems(response));

            console.log('Home document alerts loaded', {
                alertCount: resolveDocsBadgeCount(response),
                notifications: mapNotificationItems(response).length,
            });
        } catch (error) {
            console.log('Home document alerts load failed', error);
        }
    }, [session.accessToken]);

    const loadProgress = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetchInternProgress(session.accessToken);
            setData(response);
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
            } else if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage('Unable to load your OJT progress.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [session.accessToken]);

    useEffect(() => {
        loadProgress();
        loadDocumentAlerts();
    }, [loadProgress, loadDocumentAlerts]);

    const openAlertsModal = () => {
        console.log('Home document alerts opened', {
            count: notifications.length,
        });
        loadDocumentAlerts();
        setShowAlertsModal(true);
    };

    const handleMarkAlertsRead = async () => {
        if (onAcknowledgeSeen) {
            await onAcknowledgeSeen();
        }

        await loadDocumentAlerts();
        onAlertsRefresh?.();
        setShowAlertsModal(false);
    };

    const loadTimeLogs = useCallback(async () => {
        setIsLoadingTimeLogs(true);
        setTimeLogsError(null);

        try {
            const response = await fetchInternTimeLogs(session.accessToken);
            setTimeLogs(response.logs);
            setTimeLogsTotal(response.total_count);
            console.log('Home time records loaded', {
                shown: response.logs.length,
                total: response.total_count,
            });
        } catch (error) {
            const message =
                error instanceof ApiError
                    ? error.message
                    : 'Unable to load time records.';
            setTimeLogsError(message);
            console.log('Home time records load failed', error);
        } finally {
            setIsLoadingTimeLogs(false);
        }
    }, [session.accessToken]);

    const openTimeRecordsModal = () => {
        console.log('Home time records opened');
        setShowTimeRecordsModal(true);
        loadTimeLogs();
    };

    const displayName =
        data?.student.full_name ?? session.user.name;
    const progress = data?.progress;
    const course = data?.course;

    return (
        <>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <Text style={styles.heading}>OJT Progress</Text>
                        <DocumentAlertsBell
                            alertCount={documentAlertCount}
                            onPress={openAlertsModal}
                        />
                    </View>
                    <Text style={styles.greeting}>Welcome, {displayName}</Text>
                    {course ? (
                        <Text style={styles.courseMeta}>
                            {course.code} • {course.name}
                        </Text>
                    ) : null}
                    {documentAlertCount > 0 ? (
                        <Pressable
                            onPress={openAlertsModal}
                            style={({ pressed }) => [
                                styles.alertHint,
                                pressed && styles.alertHintPressed,
                            ]}
                        >
                            <Text style={styles.alertHintText}>
                                {documentAlertCount === 1
                                    ? '1 document needs your attention'
                                    : `${documentAlertCount} documents need your attention`}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>

            {isLoading ? (
                <View style={styles.stateCard}>
                    <ActivityIndicator size="large" color={colors.brand} />
                    <Text style={styles.stateText}>Loading your hours…</Text>
                </View>
            ) : null}

            {!isLoading && errorMessage ? (
                <View style={styles.stateCard}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <Pressable onPress={loadProgress} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Try again</Text>
                    </Pressable>
                </View>
            ) : null}

            {!isLoading && progress && !errorMessage ? (
                <>
                    <Pressable
                        onPress={openTimeRecordsModal}
                        style={({ pressed }) => [
                            styles.heroCard,
                            pressed && styles.heroCardPressed,
                        ]}
                    >
                        <Text style={styles.heroLabel}>Hours remaining</Text>
                        <Text style={styles.heroValue}>
                            {formatHours(progress.remaining_hours)}
                        </Text>
                        <Text style={styles.heroUnit}>hours to complete</Text>

                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${Math.min(progress.percent_complete, 100)}%`,
                                    },
                                ]}
                            />
                        </View>
                        <Text style={styles.progressCaption}>
                            {progress.percent_complete}% of required hours
                            completed
                        </Text>
                        <Text style={styles.heroHint}>Tap to view time records</Text>
                    </Pressable>

                    {progress.estimated_end_date ? (
                        <View style={styles.endDateCard}>
                            <Text style={styles.endDateLabel}>
                                Tentative end date
                            </Text>
                            <Text style={styles.endDateValue}>
                                {formatDate(progress.estimated_end_date)}
                            </Text>
                            <Text style={styles.endDateCaption}>
                                {getTentativeEndCaption(progress)}
                            </Text>
                        </View>
                    ) : null}

                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Required</Text>
                            <Text style={styles.statValue}>
                                {formatHours(progress.required_hours)}
                            </Text>
                            <Text style={styles.statUnit}>hrs</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Rendered</Text>
                            <Text style={styles.statValue}>
                                {formatHours(progress.rendered_hours)}
                            </Text>
                            <Text style={styles.statUnit}>hrs</Text>
                        </View>
                    </View>

                    <View style={styles.detailCard}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Time logs</Text>
                            <Text style={styles.detailValue}>
                                {progress.time_log_count}
                            </Text>
                        </View>
                        {progress.schedule ? (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Schedule</Text>
                                <Text style={styles.detailValue}>
                                    {progress.schedule.hours_per_day} hrs/day •{' '}
                                    {progress.schedule.days_per_week} days/week
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </>
            ) : null}
            </ScrollView>

            <DocumentAlertsModal
                visible={showAlertsModal}
                notifications={notifications}
                onClose={() => setShowAlertsModal(false)}
                onMarkRead={handleMarkAlertsRead}
                onOpenDocuments={
                    onGoToDocuments
                        ? () => {
                              setShowAlertsModal(false);
                              onGoToDocuments();
                          }
                        : undefined
                }
            />

            <TimeRecordsModal
                visible={showTimeRecordsModal}
                logs={timeLogs}
                totalCount={timeLogsTotal}
                isLoading={isLoadingTimeLogs}
                errorMessage={timeLogsError}
                onClose={() => setShowTimeRecordsModal(false)}
                onRetry={loadTimeLogs}
            />
        </>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    header: {
        marginBottom: 20,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    alertHint: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: colors.brandMuted,
        borderWidth: 1,
        borderColor: colors.border,
    },
    alertHintPressed: {
        opacity: 0.9,
    },
    alertHintText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.brand,
    },
    heading: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.brand,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    greeting: {
        marginTop: 8,
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    courseMeta: {
        marginTop: 6,
        fontSize: 14,
        lineHeight: 20,
        color: colors.textMuted,
    },
    stateCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.surface,
        padding: 24,
        alignItems: 'center',
    },
    stateText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textMuted,
    },
    errorText: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.error,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.brand,
    },
    retryButtonText: {
        color: colors.brandForeground,
        fontSize: 14,
        fontWeight: '700',
    },
    heroCard: {
        borderRadius: 18,
        backgroundColor: colors.brand,
        padding: 24,
        alignItems: 'center',
        ...Platform.select({
            android: { elevation: 4 },
            ios: {
                shadowColor: '#0F172A',
                shadowOpacity: 0.12,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
            },
        }),
    },
    heroCardPressed: {
        opacity: 0.92,
    },
    heroLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.85)',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    heroValue: {
        marginTop: 8,
        fontSize: 56,
        fontWeight: '800',
        color: colors.brandForeground,
        lineHeight: 60,
    },
    heroUnit: {
        marginTop: 4,
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    progressTrack: {
        marginTop: 20,
        width: '100%',
        height: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: colors.brandForeground,
    },
    progressCaption: {
        marginTop: 10,
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.88)',
        textAlign: 'center',
    },
    heroHint: {
        marginTop: 12,
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.78)',
    },
    endDateCard: {
        marginTop: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.brandMuted,
        padding: 18,
        alignItems: 'center',
    },
    endDateLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.brand,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    endDateValue: {
        marginTop: 8,
        fontSize: 26,
        fontWeight: '800',
        color: colors.text,
    },
    endDateCaption: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 18,
        color: colors.textMuted,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    statCard: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.surface,
        padding: 16,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    statValue: {
        marginTop: 8,
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
    },
    statUnit: {
        marginTop: 2,
        fontSize: 13,
        color: colors.textSubtle,
    },
    detailCard: {
        marginTop: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.background,
        padding: 16,
        gap: 14,
    },
    detailRow: {
        gap: 4,
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 22,
    },
});
