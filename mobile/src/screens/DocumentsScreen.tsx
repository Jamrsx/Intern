import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
    fetchInternDocumentRequirements,
    fetchInternDocuments,
} from '../api/documents';
import { ApiError } from '../api/client';
import { UploadDocumentModal } from '../components/UploadDocumentModal';
import {
    notifyPublishedRequirements,
    resolveDocsBadgeCount,
} from '../services/documentAlerts';
import { useDocumentRequirementsAutoRefresh } from '../hooks/useDocumentRequirementsAutoRefresh';
import { syncDocumentRequirementNotifications } from '../services/documentNotifications';
import { colors } from '../theme/colors';
import type { StoredSession } from '../types/auth';
import type {
    InternDocument,
    InternDocumentRequirement,
    InternDocumentRequirementsResponse,
} from '../types/documents';

type Props = {
    session: StoredSession;
    onAcknowledgeSeen?: () => Promise<void>;
    onAlertsRefresh?: () => Promise<void>;
    onBadgeCountChange?: (count: number) => void;
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

function formatDeadlineShort(iso: string): string {
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

function statusLabel(status: InternDocumentRequirement['status']): string {
    if (status === 'submitted') {
        return 'Submitted';
    }

    if (status === 'overdue') {
        return 'Overdue';
    }

    return 'Pending';
}

function SectionHeader({
    title,
    count,
}: {
    title: string;
    count?: number;
}) {
    return (
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {count !== undefined && count > 0 ? (
                <View style={styles.sectionCountPill}>
                    <Text style={styles.sectionCountPillText}>{count}</Text>
                </View>
            ) : null}
        </View>
    );
}

function PendingRequirementRow({
    requirement,
    onSubmit,
}: {
    requirement: InternDocumentRequirement;
    onSubmit: () => void;
}) {
    const isOverdue = requirement.status === 'overdue';

    return (
        <View
            style={[
                styles.pendingRow,
                isOverdue && styles.pendingRowOverdue,
            ]}
        >
            <View style={styles.pendingRowMain}>
                <View style={styles.pendingTitleRow}>
                    {requirement.is_new ? (
                        <View style={styles.requirementNewDot} />
                    ) : null}
                    <Text style={styles.pendingTitle} numberOfLines={1}>
                        {requirement.title}
                    </Text>
                </View>
                <Text style={styles.pendingDeadline} numberOfLines={1}>
                    Due {formatDeadline(requirement.deadline_at)}
                </Text>
                {requirement.description ? (
                    <Text style={styles.pendingDescription} numberOfLines={1}>
                        {requirement.description}
                    </Text>
                ) : null}
            </View>
            <View style={styles.pendingRowActions}>
                <View
                    style={[
                        styles.statusBadge,
                        isOverdue
                            ? styles.statusBadgeOverdue
                            : styles.statusBadgePending,
                    ]}
                >
                    <Text style={styles.statusBadgeText}>
                        {statusLabel(requirement.status)}
                    </Text>
                </View>
                <Pressable
                    onPress={onSubmit}
                    style={({ pressed }) => [
                        styles.pendingUploadButton,
                        pressed && styles.pendingUploadButtonPressed,
                    ]}
                >
                    <Text style={styles.pendingUploadButtonText}>Upload</Text>
                </Pressable>
            </View>
        </View>
    );
}

function SubmittedRequirementRow({
    requirement,
}: {
    requirement: InternDocumentRequirement;
}) {
    const uploadedLabel = requirement.submission
        ? formatUploadedAt(requirement.submission.uploaded_at)
        : '—';

    return (
        <View style={styles.submittedRow}>
            <View style={styles.submittedCheck}>
                <Text style={styles.submittedCheckMark}>✓</Text>
            </View>
            <View style={styles.submittedRowBody}>
                <Text style={styles.submittedTitle} numberOfLines={1}>
                    {requirement.title}
                </Text>
                <Text style={styles.submittedMeta} numberOfLines={1}>
                    {requirement.submission?.original_filename ?? 'File uploaded'}
                </Text>
                <Text style={styles.submittedMetaMuted}>
                    Submitted {uploadedLabel} · Deadline{' '}
                    {formatDeadlineShort(requirement.deadline_at)}
                </Text>
            </View>
        </View>
    );
}

function DocumentCard({ document }: { document: InternDocument }) {
    const reportTitle = document.title?.trim() || 'Untitled report';
    const kind = getFileKind(document.mime_type);

    return (
        <View style={styles.documentCardCompact}>
            <FileIcon mimeType={document.mime_type} />
            <View style={styles.documentBody}>
                <Text style={styles.documentTitle} numberOfLines={1}>
                    {reportTitle}
                </Text>
                <Text style={styles.documentFilename} numberOfLines={1}>
                    {document.original_filename}
                </Text>
                <Text style={styles.documentMeta} numberOfLines={1}>
                    {formatUploadedAt(document.uploaded_at)} ·{' '}
                    {formatFileSize(document.file_size)} · {kind.short}
                </Text>
            </View>
        </View>
    );
}

export function DocumentsScreen({
    session,
    onAcknowledgeSeen,
    onAlertsRefresh,
    onBadgeCountChange,
}: Props) {
    const [documents, setDocuments] = useState<InternDocument[]>([]);
    const [requirements, setRequirements] = useState<
        InternDocumentRequirement[]
    >([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [submittedSectionOpen, setSubmittedSectionOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedRequirement, setSelectedRequirement] =
        useState<InternDocumentRequirement | null>(null);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        pdf: false,
        word: false,
        other: false,
    });

    const pendingRequirements = useMemo(
        () =>
            requirements.filter(
                item =>
                    item.status === 'pending' || item.status === 'overdue',
            ),
        [requirements],
    );

    const submittedRequirements = useMemo(
        () => requirements.filter(item => item.status === 'submitted'),
        [requirements],
    );

    const submittedCount = submittedRequirements.length;

    const extraDocuments = useMemo(
        () =>
            documents.filter(
                document => document.document_requirement_id == null,
            ),
        [documents],
    );

    const groupedDocuments = useMemo(
        () => groupDocumentsByType(extraDocuments),
        [extraDocuments],
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

    const syncRequirementsSnapshotRef = useRef<
        (response: InternDocumentRequirementsResponse) => void
    >(() => {});

    const loadDataRef = useRef<
        (options?: { silent?: boolean }) => Promise<void>
    >(async () => {});

    const loadData = useCallback(
        async (options?: { silent?: boolean }) => {
            if (!options?.silent) {
                setIsLoading(true);
            }

            setErrorMessage(null);

            try {
                const [documentsResponse, requirementsResponse] =
                    await Promise.all([
                        fetchInternDocuments(session.accessToken),
                        fetchInternDocumentRequirements(session.accessToken),
                    ]);

                setDocuments(documentsResponse.documents);
                setRequirements(requirementsResponse.requirements);
                setPendingCount(requirementsResponse.pending_count);

                const badgeCount = resolveDocsBadgeCount(requirementsResponse);
                onBadgeCountChange?.(badgeCount);

                await notifyPublishedRequirements(requirementsResponse);
                await syncDocumentRequirementNotifications(
                    requirementsResponse.requirements,
                );

                syncRequirementsSnapshotRef.current(requirementsResponse);
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
        [session.accessToken, onBadgeCountChange],
    );

    loadDataRef.current = loadData;

    const handleRequirementsChangedFromServer = useCallback(async () => {
        console.log('Auto-refreshing documents after database change');
        setIsRefreshing(true);
        await loadDataRef.current({ silent: true });
        onAlertsRefresh?.();
    }, [onAlertsRefresh]);

    const { syncFingerprint } = useDocumentRequirementsAutoRefresh(
        session.accessToken,
        {
            enabled: true,
            onRequirementsChanged: handleRequirementsChangedFromServer,
        },
    );

    syncRequirementsSnapshotRef.current = syncFingerprint;

    useEffect(() => {
        loadData();
    }, [loadData]);

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
        loadData({ silent: true });
        onAlertsRefresh?.();
    };

    const handleUploadSuccess = (message: string) => {
        setSuccessMessage(message);
        setSelectedRequirement(null);
        loadData({ silent: true });
    };

    const openUploadForRequirement = (
        requirement: InternDocumentRequirement,
    ) => {
        setSelectedRequirement(requirement);
        setShowUploadModal(true);
    };

    const openGeneralUpload = () => {
        setSelectedRequirement(null);
        setShowUploadModal(true);
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
                        Required files from your coordinator. Alerts are on
                        Home.
                    </Text>
                </View>

                {!showInitialLoading && !errorMessage && requirements.length > 0 ? (
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryChip}>
                            <Text style={styles.summaryChipValue}>
                                {pendingCount}
                            </Text>
                            <Text style={styles.summaryChipLabel}>To do</Text>
                        </View>
                        <View style={styles.summaryChip}>
                            <Text style={styles.summaryChipValue}>
                                {submittedCount}
                            </Text>
                            <Text style={styles.summaryChipLabel}>Done</Text>
                        </View>
                        <View style={styles.summaryChip}>
                            <Text style={styles.summaryChipValue}>
                                {requirements.length}
                            </Text>
                            <Text style={styles.summaryChipLabel}>Total</Text>
                        </View>
                    </View>
                ) : null}

                {!showInitialLoading && !errorMessage ? (
                    <>
                        <View style={styles.sectionBlock}>
                            <SectionHeader
                                title="To submit"
                                count={pendingRequirements.length}
                            />
                            {requirements.length === 0 ? (
                                <View style={styles.emptySectionCard}>
                                    <Text style={styles.emptySectionText}>
                                        No required documents yet. Your
                                        coordinator will assign MOA, reports,
                                        and other files here.
                                    </Text>
                                </View>
                            ) : pendingRequirements.length === 0 ? (
                                <View style={styles.emptySectionCard}>
                                    <Text style={styles.emptySectionText}>
                                        All required documents are submitted.
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.pendingList}>
                                    {pendingRequirements.map(requirement => (
                                        <PendingRequirementRow
                                            key={requirement.id}
                                            requirement={requirement}
                                            onSubmit={() =>
                                                openUploadForRequirement(
                                                    requirement,
                                                )
                                            }
                                        />
                                    ))}
                                </View>
                            )}
                        </View>

                        {submittedCount > 0 ? (
                            <View style={styles.sectionBlock}>
                                <Pressable
                                    onPress={() => {
                                        setSubmittedSectionOpen(open => !open);
                                        console.log('Submitted section toggled');
                                    }}
                                    style={({ pressed }) => [
                                        styles.sectionHeaderRow,
                                        pressed && styles.sectionHeaderPressed,
                                    ]}
                                >
                                    <Text style={styles.sectionTitle}>
                                        Submitted
                                    </Text>
                                    <View style={styles.sectionHeaderRight}>
                                        <View style={styles.sectionCountPill}>
                                            <Text
                                                style={styles.sectionCountPillText}
                                            >
                                                {submittedCount}
                                            </Text>
                                        </View>
                                        <Text
                                            style={[
                                                styles.sectionChevron,
                                                submittedSectionOpen &&
                                                    styles.sectionChevronOpen,
                                            ]}
                                        >
                                            ›
                                        </Text>
                                    </View>
                                </Pressable>
                                {submittedSectionOpen ? (
                                    <View style={styles.submittedContainer}>
                                        {submittedRequirements.map(
                                            (requirement, index) => (
                                                <View key={requirement.id}>
                                                    <SubmittedRequirementRow
                                                        requirement={
                                                            requirement
                                                        }
                                                    />
                                                    {index <
                                                    submittedRequirements.length -
                                                        1 ? (
                                                        <View
                                                            style={
                                                                styles.submittedDivider
                                                            }
                                                        />
                                                    ) : null}
                                                </View>
                                            ),
                                        )}
                                    </View>
                                ) : null}
                            </View>
                        ) : null}
                    </>
                ) : null}

                <Pressable
                    onPress={openGeneralUpload}
                    style={({ pressed }) => [
                        styles.uploadRow,
                        pressed && styles.uploadRowPressed,
                    ]}
                >
                    <View style={styles.uploadRowIconWrap}>
                        <Text style={styles.uploadRowIconText}>+</Text>
                    </View>
                    <View style={styles.uploadRowCopy}>
                        <Text style={styles.uploadRowTitle}>
                            Optional upload
                        </Text>
                        <Text style={styles.uploadRowSubtitle}>
                            PDF or Word · not tied to a requirement
                        </Text>
                    </View>
                    <Text style={styles.uploadRowChevron}>›</Text>
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
                            onPress={() => loadData()}
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
                                Other uploads
                            </Text>
                            {extraDocuments.length > 0 ? (
                                <View style={styles.countPill}>
                                    <Text style={styles.countPillText}>
                                        {extraDocuments.length}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        {extraDocuments.length === 0 ? (
                            <Text style={styles.otherUploadsEmpty}>
                                No optional uploads yet.
                            </Text>
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
                requirement={selectedRequirement}
                onClose={() => {
                    setShowUploadModal(false);
                    setSelectedRequirement(null);
                }}
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
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    summaryChip: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        backgroundColor: colors.brandMuted,
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryChipValue: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.brand,
        ...textDefaults,
    },
    summaryChipLabel: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        ...textDefaults,
    },
    sectionBlock: {
        marginBottom: 14,
        gap: 8,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionHeaderPressed: {
        opacity: 0.85,
    },
    sectionCountPill: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: 7,
        backgroundColor: colors.brandMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionCountPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.brand,
        ...textDefaults,
    },
    sectionChevron: {
        fontSize: 22,
        fontWeight: '300',
        color: colors.textMuted,
        transform: [{ rotate: '0deg' }],
    },
    sectionChevronOpen: {
        transform: [{ rotate: '90deg' }],
    },
    emptySectionCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        padding: 12,
    },
    emptySectionText: {
        fontSize: 13,
        lineHeight: 18,
        color: colors.textMuted,
        ...textDefaults,
    },
    pendingList: {
        gap: 8,
    },
    pendingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    pendingRowOverdue: {
        borderColor: '#FECACA',
        backgroundColor: '#FEF2F2',
    },
    pendingRowMain: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    pendingTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pendingTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        ...textDefaults,
    },
    pendingDeadline: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.brand,
        ...textDefaults,
    },
    pendingDescription: {
        fontSize: 12,
        color: colors.textMuted,
        ...textDefaults,
    },
    pendingRowActions: {
        alignItems: 'flex-end',
        gap: 6,
    },
    pendingUploadButton: {
        minHeight: 32,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingUploadButtonPressed: {
        backgroundColor: colors.brandHover,
    },
    pendingUploadButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.brandForeground,
        ...textDefaults,
    },
    submittedContainer: {
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 12,
        backgroundColor: '#F0FDF4',
        overflow: 'hidden',
    },
    submittedRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    submittedDivider: {
        height: 1,
        backgroundColor: '#BBF7D0',
        marginHorizontal: 12,
    },
    submittedCheck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submittedCheckMark: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.success,
    },
    submittedRowBody: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    submittedTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        ...textDefaults,
    },
    submittedMeta: {
        fontSize: 12,
        color: colors.text,
        ...textDefaults,
    },
    submittedMetaMuted: {
        fontSize: 11,
        color: colors.textMuted,
        ...textDefaults,
    },
    uploadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    uploadRowPressed: {
        opacity: 0.9,
    },
    uploadRowIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.brandMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadRowIconText: {
        fontSize: 22,
        fontWeight: '400',
        color: colors.brand,
        lineHeight: 24,
    },
    uploadRowCopy: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    uploadRowTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        ...textDefaults,
    },
    uploadRowSubtitle: {
        fontSize: 12,
        color: colors.textMuted,
        ...textDefaults,
    },
    uploadRowChevron: {
        fontSize: 22,
        color: colors.textMuted,
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
        marginTop: 4,
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
        ...textDefaults,
    },
    description: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 18,
        color: colors.textMuted,
        ...textDefaults,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        ...textDefaults,
    },
    requirementNewDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusBadgePending: {
        backgroundColor: colors.brandMuted,
    },
    statusBadgeOverdue: {
        backgroundColor: '#FEE2E2',
    },
    statusBadgeSubmitted: {
        backgroundColor: '#DCFCE7',
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.brand,
        ...textDefaults,
    },
    statusBadgeTextSubmitted: {
        color: colors.success,
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
    otherUploadsEmpty: {
        fontSize: 13,
        color: colors.textMuted,
        paddingVertical: 8,
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
    documentCardCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    fileIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
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
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
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
