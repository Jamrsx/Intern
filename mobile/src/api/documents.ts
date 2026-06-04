import { getApiBaseUrl } from '../config/api.environment';
import { ApiError } from './client';
import type {
    InternDocumentRequirementsResponse,
    InternDocumentsResponse,
    PickedUploadFile,
    UploadInternDocumentResponse,
} from '../types/documents';

export async function fetchInternDocumentRequirements(
    token: string,
): Promise<InternDocumentRequirementsResponse> {
    const url = `${getApiBaseUrl()}/api/intern/document-requirements`;

    console.log('API request', { method: 'GET', url });

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : null;

    if (!response.ok) {
        throw new ApiError(
            payload?.message ?? 'Unable to load document requirements.',
            response.status,
        );
    }

    console.log('Document requirements loaded', {
        count: payload?.requirements?.length ?? 0,
        pending: payload?.pending_count ?? 0,
        new: payload?.new_count ?? 0,
        unread: payload?.unread_count ?? 0,
    });

    return payload as InternDocumentRequirementsResponse;
}

export async function markDocumentRequirementsSeen(
    token: string,
): Promise<void> {
    const url = `${getApiBaseUrl()}/api/intern/document-requirements/seen`;

    console.log('API request', { method: 'POST', url });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : null;

    if (!response.ok) {
        throw new ApiError(
            payload?.message ?? 'Unable to update notification status.',
            response.status,
        );
    }

    console.log('Document requirements marked as seen', payload);
}

export async function fetchInternDocuments(
    token: string,
): Promise<InternDocumentsResponse> {
    const url = `${getApiBaseUrl()}/api/intern/documents`;

    console.log('API request', { method: 'GET', url });

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : null;

    if (!response.ok) {
        const fieldErrors =
            payload?.errors && typeof payload.errors === 'object'
                ? (payload.errors as Record<string, string[]>)
                : {};

        throw new ApiError(
            payload?.message ?? 'Unable to load documents.',
            response.status,
            fieldErrors,
        );
    }

    console.log('Intern documents loaded', {
        count: payload?.documents?.length ?? 0,
    });

    return payload as InternDocumentsResponse;
}

export async function uploadInternDocument(
    token: string,
    file: PickedUploadFile,
    options?: {
        title?: string;
        documentRequirementId?: number;
    },
): Promise<UploadInternDocumentResponse> {
    const url = `${getApiBaseUrl()}/api/intern/documents`;
    const formData = new FormData();

    if (options?.documentRequirementId) {
        formData.append(
            'document_requirement_id',
            String(options.documentRequirementId),
        );
    }

    if (options?.title?.trim()) {
        formData.append('title', options.title.trim());
    }
    formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
    } as unknown as Blob);

    console.log('API upload document', {
        url,
        title: options?.title,
        requirementId: options?.documentRequirementId,
        filename: file.name,
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : null;

    if (!response.ok) {
        const fieldErrors =
            payload?.errors && typeof payload.errors === 'object'
                ? (payload.errors as Record<string, string[]>)
                : {};

        throw new ApiError(
            payload?.message ??
                fieldErrors.file?.[0] ??
                fieldErrors.title?.[0] ??
                'Unable to upload document.',
            response.status,
            fieldErrors,
        );
    }

    console.log('Document uploaded', {
        id: payload?.document?.id,
        title: payload?.document?.title,
    });

    return payload as UploadInternDocumentResponse;
}
