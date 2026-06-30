import { getApiBaseUrl } from '../config/api.environment';
import { ApiError } from './client';
import ReactNativeBlobUtil from 'react-native-blob-util';
import type {
    InternAbsencesResponse,
    JustifyAbsenceResponse,
    PickedAbsenceProof,
} from '../types/absence';

async function parseJsonResponse(
    response: { text: () => Promise<string>; info: () => { status: number } },
): Promise<Record<string, unknown> | null> {
    const raw = await response.text();

    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function buildValidationError(
    payload: Record<string, unknown> | null,
    fallback: string,
    status: number,
): ApiError {
    const fieldErrors =
        payload?.errors && typeof payload.errors === 'object'
            ? (payload.errors as Record<string, string[]>)
            : {};

    const message =
        (typeof payload?.message === 'string' ? payload.message : null) ??
        fieldErrors.reason?.[0] ??
        fieldErrors.proof?.[0] ??
        fallback;

    return new ApiError(message, status, fieldErrors);
}

export async function fetchInternAbsences(
    token: string,
): Promise<InternAbsencesResponse> {
    const url = `${getApiBaseUrl()}/api/intern/absences`;

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
        ? ((await response.json()) as Record<string, unknown>)
        : null;

    if (!response.ok) {
        throw buildValidationError(
            payload,
            'Unable to load absences.',
            response.status,
        );
    }

    return payload as InternAbsencesResponse;
}

export async function justifyInternAbsence(
    token: string,
    absenceId: number,
    reason: string,
    proof?: PickedAbsenceProof | null,
): Promise<JustifyAbsenceResponse> {
    const url = `${getApiBaseUrl()}/api/intern/absences/${absenceId}/justify`;

    console.log('API justify absence', { url, absenceId, hasProof: Boolean(proof) });

    const wrappedParts: Array<{
        name: string;
        data: string;
    }> = [
        {
            name: 'reason',
            data: reason,
        },
    ];

    if (proof) {
        const filePath = proof.uri.startsWith('file://')
            ? proof.uri
            : `file://${proof.uri}`;

        wrappedParts.push({
            name: 'proof',
            filename: proof.name,
            type: proof.type,
            data: ReactNativeBlobUtil.wrap(filePath),
        });
    }

    const response = await ReactNativeBlobUtil.fetch(
        'POST',
        url,
        {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'multipart/form-data',
        },
        wrappedParts,
    );

    const status = response.info().status;
    const payload = await parseJsonResponse(response);

    if (status < 200 || status >= 300) {
        throw buildValidationError(
            payload,
            'Unable to submit absence reason.',
            status,
        );
    }

    console.log('Absence justified', { absenceId });

    return payload as JustifyAbsenceResponse;
}

export function buildAbsenceProofUrl(absenceId: number): string {
    return `${getApiBaseUrl()}/api/intern/absences/${absenceId}/proof`;
}
