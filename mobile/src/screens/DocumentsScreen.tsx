import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    RefreshControl,
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

const textDefaults = Platform.select({
    android: { includeFontPadding: false as const },
    default: {},
});

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

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

type FileCategory = 'pdf' | 'word' | 'other';

function getFileCategory(mimeType: string): FileCategory {
    if (mimeType.includes('pdf')) {
        return 'pdf';
    }

    if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
        return 'word';
    }

    return 'other';
}

function getFileKind(mimeType: string): { label: string; short: string } {
    const category = getFileCategory(mimeType);

    if (category === 'pdf') {
        return { label: 'PDF document', short: 'PDF' };
    }

    if (category === 'word') {
        return { label: 'Word document', short: 'DOC' };
    }

    return { label: 'Document', short: 'FILE' };
}

function groupDocumentsByType(documents: InternDocument[]) {
    const pdf: InternDocument[] = [];
    const word: InternDocument[] = [];
    const other: InternDocument[] = [];

    for (const document of documents) {
        const category = getFileCategory(document.mime_type);

        if (category === 'pdf') {
            pdf.push(document);
        } else if (category === 'word') {
            word.push(document);
        } else {
            other.push(document);
        }
    }

    return { pdf, word, other };
}

type DocumentGroupConfig = {
    id: FileCategory | 'other';
    title: string;
    subtitle: string;
    documents: InternDocument[];
};

function DocumentGroupSection({
    group,
    isOpen,
    onToggle,
}: {
    group: DocumentGroupConfig;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <View style={styles.groupCard}>
            <Pressable
                onPress={onToggle}
                style={({ pressed }) => [
                    styles.groupHeader,
                    pressed && styles.groupHeaderPressed,
                ]}
            >
                <View style={styles.groupHeaderCopy}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <Text style={styles.groupSubtitle}>
                        {group.subtitle} · {group.documents.length}{' '}
                        {group.documents.length === 1 ? 'file' : 'files'}
                    </Text>
                </View>
                <View style={styles.groupHeaderRight}>
                    <View style={styles.groupCountPill}>
                        <Text style={styles.groupCountPillText}>
                            {group.documents.length}
                        </Text>
                    </View>
                    <Text
                        style={[
                            styles.groupChevron,
                            isOpen && styles.groupChevronOpen,
                        ]}
                    >
                        ›
                    </Text>
                </View>
            </Pressable>

            {isOpen ? (
                <View style={styles.groupContent}>
                    {group.documents.length === 0 ? (
                        <Text style={styles.groupEmptyText}>
                            No files in this category yet.
                        </Text>
                    ) : (
                        group.documents.map(document => (
                            <DocumentCard
                                key={document.id}
                                document={document}
                            />
                        ))
                    )}
                </View>
            ) : null}
        </View>
    );
}

function FileIcon({ mimeType }: { mimeType: string }) {
    const kind = getFileKind(mimeType);

    return (
        <View style={styles.fileIcon}>
            <Text style={styles.fileIconText}>{kind.short}</Text>
        </View>
    );
}

function DocumentCard({ document }: { document: InternDocument }) {
    const reportTitle = document.title?.trim() || 'Untitled report';
    const kind = getFileKind(document.mime_type);

    return (
        <View style={styles.documentCard}>
            <FileIcon mimeType={document.mime_type} />
            <View style={styles.documentBody}>
                <View style={styles.documentTitleRow}>
                    <Text
                        style={styles.documentTitle}
                        numberOfLines={2}
                    >
                        {reportTitle}
                    </Text>
                </View>
                <Text style={styles.documentFilename} numberOfLines={1}>
                    {document.original_filename}
                </Text>
                <View style={styles.documentMetaRow}>
                    <Text style={styles.documentMeta}>
                        {formatUploadedAt(document.uploaded_at)}
                    </Text>
                    <Text style={styles.documentMetaDot}>·</Text>
                    <Text style={styles.documentMeta}>
                        {formatFileSize(document.file_size)}
                    </Text>
                    <Text style={styles.documentMetaDot}>·</Text>
                    <Text style={styles.documentMeta}>{kind.label}</Text>
                </View>
            </View>
        </View>
    );
}

export function DocumentsScreen({ session }: Props) {
    const [documents, setDocuments] = useState<InternDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        pdf: true,
        word: true,
        other: true,
    });

    const groupedDocuments = useMemo(
        () => groupDocumentsByType(documents),
        [documents],
    );

    const documentGroups = useMemo((): DocumentGroupConfig[] => {
        const groups: DocumentGroupConfig[] = [
            {
                id: 'pdf',
                title: 'PDF files',
                subtitle: 'Portable document format',
                documents: groupedDocuments.pdf,
            },
            {
                id: 'word',
                title: 'Word files',
                subtitle: 'Microsoft Word documents',
                documents: groupedDocuments.word,
            },
        ];

        if (groupedDocuments.other.length > 0) {
            groups.push({
                id: 'other',
                title: 'Other files',
                subtitle: 'Additional uploads',
                documents: groupedDocuments.other,
            });
        }

        return groups;
    }, [groupedDocuments]);

    const toggleGroup = (groupId: string) => {
        setOpenGroups(current => ({
            ...current,
            [groupId]: !current[groupId],
        }));
        console.log('Document group toggled', { groupId });
    };

    const loadDocuments = useCallback(
        async (options?: { silent?: boolean }) => {
            if (!options?.silent) {
                setIsLoading(true);
            }

            setErrorMessage(null);

            try {
                const response = await fetchInternDocuments(
                    session.accessToken,
                );
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
                setIsRefreshing(false);
            }
        },
        [session.accessToken],
    );

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timer = setTimeout(() => {
            setSuccessMessage(null);
        }, 4000);

        return () => clearTimeout(timer);
    }, [successMessage]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadDocuments({ silent: true });
    };

    const handleUploadSuccess = (message: string) => {
        setSuccessMessage(message);
        loadDocuments({ silent: true });
    };

    const showInitialLoading = isLoading && !isRefreshing && documents.length === 0;

    return (
        <View style={styles.screen}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.brand]}
                        tintColor={colors.brand}
                    />
                }
            >
                <View style={styles.header}>
                    <Text style={styles.eyebrow}>Submissions</Text>
                    <Text style={styles.heading}>Documents</Text>
                    <Text style={styles.description}>
                        Submit your MOA, weekly reports, and other required
                        files. Your coordinator reviews them on the web portal.
                    </Text>
                </View>

                {!showInitialLoading && !errorMessage ? (
                    <View style={styles.statsCard}>
                        <View style={styles.statBlock}>
                            <Text style={styles.statValue}>
                                {groupedDocuments.pdf.length}
                            </Text>
                            <Text style={styles.statLabel}>PDF</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBlock}>
                            <Text style={styles.statValue}>
                                {groupedDocuments.word.length}
                            </Text>
                            <Text style={styles.statLabel}>Word</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBlock}>
                            <Text style={styles.statValue}>
                                {documents.length}
                            </Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                    </View>
                ) : null}

                <Pressable
                    onPress={() => setShowUploadModal(true)}
                    style={({ pressed }) => [
                        styles.uploadCard,
                        pressed && styles.uploadCardPressed,
                    ]}
                >
                    <View style={styles.uploadIconWrap}>
                        <Text style={styles.uploadIcon}>+</Text>
                    </View>
                    <View style={styles.uploadCopy}>
                        <Text style={styles.uploadTitle}>Upload document</Text>
                        <Text style={styles.uploadSubtitle}>
                            PDF or Word · name your report (MOA, Week 1…)
                        </Text>
                    </View>
                    <Text style={styles.uploadChevron}>›</Text>
                </Pressable>

                {successMessage ? (
                    <View style={styles.successBanner}>
                        <Text style={styles.successText}>{successMessage}</Text>
                    </View>
                ) : null}

                {showInitialLoading ? (
                    <View style={styles.stateCard}>
                        <ActivityIndicator size="large" color={colors.brand} />
                        <Text style={styles.stateText}>
                            Loading your documents…
                        </Text>
                    </View>
                ) : null}

                {!showInitialLoading && errorMessage ? (
                    <View style={styles.stateCard}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                        <Pressable
                            onPress={() => loadDocuments()}
                            style={styles.retryButton}
                        >
                            <Text style={styles.retryButtonText}>
                                Try again
                            </Text>
                        </Pressable>
                    </View>
                ) : null}

                {!showInitialLoading && !errorMessage ? (
                    <View style={styles.listSection}>
                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle}>
                                Your submissions
                            </Text>
                            {documents.length > 0 ? (
                                <View style={styles.countPill}>
                                    <Text style={styles.countPillText}>
                                        {documents.length}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        {documents.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <View style={styles.emptyIconWrap}>
                                    <Text style={styles.emptyIconText}>
                                        DOC
                                    </Text>
                                </View>
                                <Text style={styles.emptyTitle}>
                                    No uploads yet
                                </Text>
                                <Text style={styles.emptyText}>
                                    Tap Upload document above to send your MOA
                                    or weekly report to your coordinator.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.groupList}>
                                {documentGroups.map(group => (
                                    <DocumentGroupSection
                                        key={group.id}
                                        group={group}
                                        isOpen={
                                            openGroups[group.id] ?? true
                                        }
                                        onToggle={() =>
                                            toggleGroup(group.id)
                                        }
                                    />
                                ))}
                            </View>
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
    eyebrow: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.brand,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        ...textDefaults,
    },
    heading: {
        marginTop: 6,
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        ...textDefaults,
    },
    description: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 20,
        color: colors.textMuted,
        ...textDefaults,
    },
    statsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: colors.brandMuted,
        borderWidth: 1,
        borderColor: 'rgba(24, 79, 185, 0.12)',
        paddingVertical: 16,
        paddingHorizontal: 12,
        marginBottom: 14,
    },
    statBlock: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statDivider: {
        width: 1,
        height: 36,
        backgroundColor: 'rgba(24, 79, 185, 0.2)',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.brand,
        ...textDefaults,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        ...textDefaults,
    },
    uploadCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 16,
        backgroundColor: colors.brand,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            android: { elevation: 3 },
            ios: {
                shadowColor: colors.brand,
                shadowOpacity: 0.22,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
            },
        }),
    },
    uploadCardPressed: {
        backgroundColor: colors.brandHover,
    },
    uploadIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadIcon: {
        fontSize: 28,
        fontWeight: '300',
        color: colors.brandForeground,
        lineHeight: 30,
        marginTop: -2,
    },
    uploadCopy: {
        flex: 1,
        minWidth: 0,
        gap: 3,
    },
    uploadTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.brandForeground,
        ...textDefaults,
    },
    uploadSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        color: 'rgba(255, 255, 255, 0.88)',
        ...textDefaults,
    },
    uploadChevron: {
        fontSize: 26,
        fontWeight: '300',
        color: 'rgba(255, 255, 255, 0.75)',
    },
    successBanner: {
        marginBottom: 14,
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
        ...textDefaults,
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
        ...textDefaults,
    },
    errorText: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.error,
        textAlign: 'center',
        ...textDefaults,
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
        ...textDefaults,
    },
    listSection: {
        gap: 12,
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    listTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        ...textDefaults,
    },
    countPill: {
        minWidth: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.brandMuted,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    countPillText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.brand,
        ...textDefaults,
    },
    emptyCard: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.surface,
        paddingVertical: 28,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    emptyIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: colors.brandMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    emptyIconText: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.brand,
        ...textDefaults,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
        ...textDefaults,
    },
    emptyText: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 20,
        color: colors.textMuted,
        textAlign: 'center',
        maxWidth: 280,
        ...textDefaults,
    },
    groupList: {
        gap: 12,
    },
    groupCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.surface,
        overflow: 'hidden',
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        backgroundColor: colors.background,
    },
    groupHeaderPressed: {
        backgroundColor: colors.brandMuted,
    },
    groupHeaderCopy: {
        flex: 1,
        minWidth: 0,
        gap: 3,
    },
    groupTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        ...textDefaults,
    },
    groupSubtitle: {
        fontSize: 12,
        color: colors.textMuted,
        ...textDefaults,
    },
    groupHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    groupCountPill: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.brandMuted,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    groupCountPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.brand,
        ...textDefaults,
    },
    groupChevron: {
        fontSize: 22,
        fontWeight: '300',
        color: colors.textSubtle,
        transform: [{ rotate: '0deg' }],
    },
    groupChevronOpen: {
        transform: [{ rotate: '90deg' }],
    },
    groupContent: {
        padding: 12,
        paddingTop: 4,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    groupEmptyText: {
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
        paddingVertical: 12,
        ...textDefaults,
    },
    documentCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.surface,
        padding: 14,
    },
    fileIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.brandMuted,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    fileIconText: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.brand,
        ...textDefaults,
    },
    documentBody: {
        flex: 1,
        minWidth: 0,
        gap: 4,
    },
    documentTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    documentTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 22,
        ...textDefaults,
    },
    documentFilename: {
        fontSize: 13,
        color: colors.textMuted,
        ...textDefaults,
    },
    documentMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: 2,
        gap: 4,
    },
    documentMeta: {
        fontSize: 12,
        color: colors.textSubtle,
        ...textDefaults,
    },
    documentMetaDot: {
        fontSize: 12,
        color: colors.textSubtle,
    },
});
