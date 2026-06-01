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
import { fetchInternDocuments } from '../api/documents';
import { ApiError } from '../api/client';
import { UploadDocumentModal } from '../components/UploadDocumentModal';
import { colors } from '../theme/colors';
import type { StoredSession } from '../types/auth';
import type { InternDocument } from '../types/documents';

type Props = {
    session: StoredSession;
};

function formatFileSize(bytes: number | null): string {
    if (bytes === null || bytes <= 0) {
        return '—';
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(iso: string): string {
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

function DocumentCard({ document }: { document: InternDocument }) {
    const reportTitle = document.title?.trim() || 'Untitled report';

    return (
        <View style={styles.documentCard}>
            <View style={styles.documentHeader}>
                <Text style={styles.documentTitle}>{reportTitle}</Text>
                <View style={styles.fileTypeBadge}>
                    <Text style={styles.fileTypeBadgeText}>
                        {document.mime_type.includes('pdf') ? 'PDF' : 'DOC'}
                    </Text>
                </View>
            </View>
            <Text style={styles.documentFilename} numberOfLines={1}>
                {document.original_filename}
            </Text>
            <Text style={styles.documentMeta}>
                {formatUploadedAt(document.uploaded_at)} ·{' '}
                {formatFileSize(document.file_size)}
            </Text>
        </View>
    );
}

export function DocumentsScreen({ session }: Props) {
    const [documents, setDocuments] = useState<InternDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const loadDocuments = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetchInternDocuments(session.accessToken);
            setDocuments(response.documents);
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
            } else if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage('Unable to load your documents.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [session.accessToken]);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const handleUploadSuccess = (message: string) => {
        setSuccessMessage(message);
        loadDocuments();
    };

    return (
        <View style={styles.screen}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={styles.heading}>Documents</Text>
                    <Text style={styles.description}>
                        Upload your MOA, weekly reports, and other required
                        files. Your coordinator can view them on the web
                        portal.
                    </Text>
                </View>

                <Pressable
                    onPress={() => setShowUploadModal(true)}
                    style={({ pressed }) => [
                        styles.uploadButton,
                        pressed && styles.uploadButtonPressed,
                    ]}
                >
                    <Text style={styles.uploadButtonText}>Upload document</Text>
                </Pressable>

                {successMessage ? (
                    <View style={styles.successBanner}>
                        <Text style={styles.successText}>{successMessage}</Text>
                    </View>
                ) : null}

                {isLoading ? (
                    <View style={styles.stateCard}>
                        <ActivityIndicator size="large" color={colors.brand} />
                        <Text style={styles.stateText}>Loading documents…</Text>
                    </View>
                ) : null}

                {!isLoading && errorMessage ? (
                    <View style={styles.stateCard}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                        <Pressable
                            onPress={loadDocuments}
                            style={styles.retryButton}
                        >
                            <Text style={styles.retryButtonText}>Try again</Text>
                        </Pressable>
                    </View>
                ) : null}

                {!isLoading && !errorMessage ? (
                    <View style={styles.listSection}>
                        <Text style={styles.listTitle}>
                            Your uploads ({documents.length})
                        </Text>

                        {documents.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyTitle}>
                                    No documents yet
                                </Text>
                                <Text style={styles.emptyText}>
                                    Tap Upload document to submit your MOA or
                                    weekly report.
                                </Text>
                            </View>
                        ) : (
                            documents.map(document => (
                                <DocumentCard
                                    key={document.id}
                                    document={document}
                                />
                            ))
                        )}
                    </View>
                ) : null}
            </ScrollView>

            <UploadDocumentModal
                visible={showUploadModal}
                accessToken={session.accessToken}
                onClose={() => setShowUploadModal(false)}
                onSuccess={handleUploadSuccess}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 28,
    },
    header: {
        marginBottom: 16,
    },
    heading: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
    },
    description: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 20,
        color: colors.textMuted,
    },
    uploadButton: {
        minHeight: 52,
        borderRadius: 12,
        backgroundColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        ...Platform.select({
            android: { elevation: 2 },
            ios: {
                shadowColor: colors.brand,
                shadowOpacity: 0.2,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
            },
        }),
    },
    uploadButtonPressed: {
        backgroundColor: colors.brandHover,
    },
    uploadButtonText: {
        color: colors.brandForeground,
        fontSize: 16,
        fontWeight: '700',
    },
    successBanner: {
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: '#ECFDF3',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        padding: 12,
    },
    successText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.success,
        textAlign: 'center',
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
        marginTop: 14,
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
    listSection: {
        gap: 10,
    },
    listTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 4,
    },
    emptyCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.surface,
        padding: 20,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    emptyText: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 20,
        color: colors.textMuted,
        textAlign: 'center',
    },
    documentCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.surface,
        padding: 14,
        gap: 4,
    },
    documentHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
    },
    documentTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 22,
    },
    fileTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: colors.brandMuted,
    },
    fileTypeBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.brand,
    },
    documentFilename: {
        fontSize: 13,
        color: colors.textMuted,
    },
    documentMeta: {
        fontSize: 12,
        color: colors.textSubtle,
        marginTop: 2,
    },
});
