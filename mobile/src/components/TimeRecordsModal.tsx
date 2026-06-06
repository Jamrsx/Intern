import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors } from '../theme/colors';
import type { TimeLogSegment } from '../types/time';

type Props = {
    visible: boolean;
    logs: TimeLogSegment[];
    totalCount: number;
    isLoading: boolean;
    errorMessage: string | null;
    onClose: () => void;
    onRetry: () => void;
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

function formatDateHeading(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function groupLogsByDate(
    logs: TimeLogSegment[],
): { date: string; items: TimeLogSegment[] }[] {
    const groups: { date: string; items: TimeLogSegment[] }[] = [];

    logs.forEach((log) => {
        const date = formatDateHeading(log.time_in);
        const existing = groups.find((group) => group.date === date);

        if (existing) {
            existing.items.push(log);
        } else {
            groups.push({ date, items: [log] });
        }
    });

    return groups;
}

function TimeLogRow({ log }: { log: TimeLogSegment }) {
    const duration = log.is_open
        ? 'Active'
        : log.duration_minutes !== null
          ? formatDurationMinutes(log.duration_minutes)
          : '—';

    return (
        <View style={styles.logRow}>
            <View style={styles.logRowMain}>
                <Text style={styles.logTimes}>
                    {formatClock(log.time_in)}
                    {log.time_out
                        ? ` – ${formatClock(log.time_out)}`
                        : ' – now'}
                </Text>
                <Text style={styles.logCaption}>Time in · Time out</Text>
            </View>
            <Text
                style={[
                    styles.logDuration,
                    log.is_open && styles.logDurationActive,
                ]}
            >
                {duration}
            </Text>
        </View>
    );
}

export function TimeRecordsModal({
    visible,
    logs,
    totalCount,
    isLoading,
    errorMessage,
    onClose,
    onRetry,
}: Props) {
    const groupedLogs = groupLogsByDate(logs);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={styles.card}>
                    <Text style={styles.title}>Time records</Text>
                    <Text style={styles.subtitle}>
                        Your previous Time in and Time out entries.
                    </Text>

                    {isLoading ? (
                        <View style={styles.stateBox}>
                            <ActivityIndicator color={colors.brand} />
                            <Text style={styles.stateText}>Loading records…</Text>
                        </View>
                    ) : null}

                    {!isLoading && errorMessage ? (
                        <View style={styles.stateBox}>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                            <Pressable
                                onPress={onRetry}
                                style={styles.retryButton}
                            >
                                <Text style={styles.retryButtonText}>
                                    Try again
                                </Text>
                            </Pressable>
                        </View>
                    ) : null}

                    {!isLoading && !errorMessage ? (
                        <ScrollView
                            style={styles.list}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {logs.length === 0 ? (
                                <Text style={styles.emptyText}>
                                    No time records yet. Use the Time tab to
                                    Time in and Time out.
                                </Text>
                            ) : (
                                groupedLogs.map((group) => (
                                    <View key={group.date} style={styles.dateGroup}>
                                        <Text style={styles.dateHeading}>
                                            {group.date}
                                        </Text>
                                        {group.items.map((log, index) => (
                                            <View key={log.id}>
                                                <TimeLogRow log={log} />
                                                {index < group.items.length - 1 ? (
                                                    <View
                                                        style={styles.divider}
                                                    />
                                                ) : null}
                                            </View>
                                        ))}
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    ) : null}

                    {!isLoading && !errorMessage && logs.length > 0 ? (
                        <Text style={styles.footerNote}>
                            Showing {logs.length} of {totalCount} records
                        </Text>
                    ) : null}

                    <Pressable
                        onPress={onClose}
                        style={({ pressed }) => [
                            styles.closeButton,
                            pressed && styles.closeButtonPressed,
                        ]}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        zIndex: 50,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
    },
    card: {
        maxHeight: '82%',
        backgroundColor: colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 28 : 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    subtitle: {
        marginTop: 6,
        fontSize: 14,
        lineHeight: 20,
        color: colors.textMuted,
    },
    stateBox: {
        alignItems: 'center',
        paddingVertical: 28,
        gap: 12,
    },
    stateText: {
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
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.brand,
    },
    retryButtonText: {
        color: colors.brandForeground,
        fontSize: 14,
        fontWeight: '700',
    },
    list: {
        marginTop: 16,
        maxHeight: 420,
    },
    listContent: {
        gap: 14,
        paddingBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        lineHeight: 21,
        color: colors.textMuted,
        paddingVertical: 12,
    },
    dateGroup: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    dateHeading: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    logRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        gap: 12,
    },
    logRowMain: {
        flex: 1,
        gap: 2,
    },
    logTimes: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    logCaption: {
        fontSize: 11,
        color: colors.textSubtle,
    },
    logDuration: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textMuted,
    },
    logDurationActive: {
        color: colors.success,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
    },
    footerNote: {
        marginTop: 10,
        fontSize: 12,
        color: colors.textSubtle,
        textAlign: 'center',
    },
    closeButton: {
        marginTop: 14,
        minHeight: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.brandMuted,
    },
    closeButtonPressed: {
        opacity: 0.88,
    },
    closeButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.brand,
    },
});
