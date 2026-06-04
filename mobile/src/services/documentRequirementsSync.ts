import type { InternDocumentRequirementsResponse } from '../types/documents';

/**
 * Stable snapshot of coordinator-assigned requirements for change detection.
 */
export function buildRequirementsFingerprint(
    response: InternDocumentRequirementsResponse,
): string {
    const requirementParts = [...response.requirements]
        .sort((a, b) => a.id - b.id)
        .map(
            requirement =>
                [
                    requirement.id,
                    requirement.status,
                    requirement.is_new ? 1 : 0,
                    requirement.published_at ?? '',
                    requirement.deadline_at,
                    requirement.title,
                    requirement.submission?.uploaded_at ?? '',
                ].join(':'),
        )
        .join('|');

    return [
        response.requirements.length,
        response.pending_count,
        response.new_count ?? 0,
        response.server_time ?? '',
        requirementParts,
    ].join('#');
}

export function requirementsDataChanged(
    previousFingerprint: string | null,
    response: InternDocumentRequirementsResponse,
): boolean {
    if (previousFingerprint === null) {
        return false;
    }

    return (
        buildRequirementsFingerprint(response) !== previousFingerprint
    );
}
