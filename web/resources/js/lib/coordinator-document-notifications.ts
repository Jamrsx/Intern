const SEEN_STORAGE_PREFIX = 'coordinator-doc-seen-section-';
const BASELINE_STORAGE_PREFIX = 'coordinator-doc-baseline-section-';

export type DocumentNotificationStudent = {
    id: number;
    latest_document_uploaded_at: string | null;
};

function seenStorageKey(sectionId: number): string {
    return `${SEEN_STORAGE_PREFIX}${sectionId}`;
}

function baselineStorageKey(sectionId: number): string {
    return `${BASELINE_STORAGE_PREFIX}${sectionId}`;
}

export function readDocumentSeenMap(
    sectionId: number,
): Record<number, string> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = localStorage.getItem(seenStorageKey(sectionId));

        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw) as Record<string, string>;

        return Object.fromEntries(
            Object.entries(parsed).map(([id, value]) => [
                Number(id),
                value,
            ]),
        );
    } catch {
        return {};
    }
}

export function persistDocumentSeenMap(
    sectionId: number,
    seenMap: Record<number, string>,
): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(
        seenStorageKey(sectionId),
        JSON.stringify(seenMap),
    );
}

export function isDocumentBaselineComplete(sectionId: number): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return localStorage.getItem(baselineStorageKey(sectionId)) === '1';
}

export function markDocumentBaselineComplete(sectionId: number): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(baselineStorageKey(sectionId), '1');
}

/**
 * On first visit to a section's student list, record current uploads as "seen"
 * so only future uploads trigger notifications.
 */
export function ensureDocumentNotificationBaseline(
    sectionId: number,
    students: DocumentNotificationStudent[],
): Record<number, string> {
    const seenMap = readDocumentSeenMap(sectionId);

    if (isDocumentBaselineComplete(sectionId)) {
        return seenMap;
    }

    const nextSeenMap = { ...seenMap };

    for (const student of students) {
        if (student.latest_document_uploaded_at) {
            nextSeenMap[student.id] = student.latest_document_uploaded_at;
        }
    }

    persistDocumentSeenMap(sectionId, nextSeenMap);
    markDocumentBaselineComplete(sectionId);

    console.log('Coordinator document notification baseline saved', {
        sectionId,
        studentCount: students.length,
    });

    return nextSeenMap;
}

export function hasUnreadDocumentSubmission(
    student: DocumentNotificationStudent,
    seenMap: Record<number, string>,
): boolean {
    if (!student.latest_document_uploaded_at) {
        return false;
    }

    const seenAt = seenMap[student.id];

    if (!seenAt) {
        return true;
    }

    return (
        new Date(student.latest_document_uploaded_at).getTime() >
        new Date(seenAt).getTime()
    );
}

export function markStudentDocumentsAsSeen(
    sectionId: number,
    studentId: number,
    latestDocumentUploadedAt: string | null,
): void {
    if (!latestDocumentUploadedAt) {
        return;
    }

    const seenMap = readDocumentSeenMap(sectionId);
    seenMap[studentId] = latestDocumentUploadedAt;
    persistDocumentSeenMap(sectionId, seenMap);

    console.log('Coordinator marked student documents as seen', {
        sectionId,
        studentId,
        latestDocumentUploadedAt,
    });
}

export function countUnreadDocumentSubmissions(
    students: DocumentNotificationStudent[],
    seenMap: Record<number, string>,
): number {
    return students.filter((student) =>
        hasUnreadDocumentSubmission(student, seenMap),
    ).length;
}
