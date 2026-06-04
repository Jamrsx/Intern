import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import type { DocumentNotificationItem } from '../types/documents';
import { colors } from '../theme/colors';

type Props = {
    visible: boolean;
    notifications: DocumentNotificationItem[];
    onClose: () => void;
    onMarkRead?: () => void;
    onOpenDocuments?: () => void;
};

function formatDeadline(iso: string): string {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return iso;
    }

    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function DocumentAlertsModal({
    visible,
    notifications,
    onClose,
    onMarkRead,
    onOpenDocuments,
}: Props) {
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
                    <Text style={styles.title}>Document alerts</Text>
                    <Text style={styles.subtitle}>
                        New assignments and submissions due from your
                        coordinator.
                    </Text>

                    <ScrollView
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {notifications.length === 0 ? (
                            <Text style={styles.emptyText}>
                                No alerts right now. Your coordinator will
                                notify you here when new documents are assigned.
                            </Text>
                        ) : (
                            notifications.map(item => (
                                <View key={item.id} style={styles.alertRow}>
                                    <View style={styles.alertRowHeader}>
                                        <Text style={styles.alertTitle}>
                                            {item.title}
                                        </Text>
                                        {item.is_new ? (
                                            <View style={styles.newDot} />
                                        ) : null}
                                    </View>
                                    <Text style={styles.alertMessage}>
                                        {item.message}
                                    </Text>
                                    <Text style={styles.alertDeadline}>
                                        Deadline: {formatDeadline(item.deadline_at)}
                                    </Text>
                                </View>
                            ))
                        )}
                    </ScrollView>

                    <View style={styles.actions}>
                        {onOpenDocuments && notifications.length > 0 ? (
                            <Pressable
                                onPress={onOpenDocuments}
                                style={({ pressed }) => [
                                    styles.docsButton,
                                    pressed && styles.closeButtonPressed,
                                ]}
                            >
                                <Text style={styles.docsButtonText}>
                                    Open Docs to upload
                                </Text>
                            </Pressable>
                        ) : null}
                        {onMarkRead ? (
                            <Pressable
                                onPress={onMarkRead}
                                style={({ pressed }) => [
                                    styles.markReadButton,
                                    pressed && styles.closeButtonPressed,
                                ]}
                            >
                                <Text style={styles.markReadButtonText}>
                                    Mark all read
                                </Text>
                            </Pressable>
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
        maxHeight: '78%',
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
    list: {
        marginTop: 16,
        maxHeight: 360,
    },
    listContent: {
        gap: 10,
        paddingBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.textMuted,
        paddingVertical: 12,
    },
    alertRow: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.brandMuted,
        padding: 14,
    },
    alertRowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    alertTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    newDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
    },
    alertMessage: {
        marginTop: 6,
        fontSize: 14,
        lineHeight: 20,
        color: colors.text,
    },
    alertDeadline: {
        marginTop: 8,
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: '600',
    },
    actions: {
        marginTop: 14,
        gap: 10,
    },
    docsButton: {
        minHeight: 48,
        borderRadius: 12,
        backgroundColor: colors.brandMuted,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docsButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.brand,
    },
    markReadButton: {
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    markReadButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    closeButton: {
        minHeight: 48,
        borderRadius: 12,
        backgroundColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonPressed: {
        opacity: 0.9,
    },
    closeButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.brandForeground,
    },
});
