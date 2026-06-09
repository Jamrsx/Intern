import { getApiBaseUrl } from '../config/api.environment';
import { ApiError } from './client';
import type {
    InternFaceEnrollResponse,
    InternTimeLogsResponse,
    InternTimePunchResponse,
    InternTimeStatusResponse,
} from '../types/time';

async function parseJsonResponse(
    response: Response,
): Promise<Record<string, unknown> | null> {
    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
        return null;
    }

    return (await response.json()) as Record<string, unknown>;
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
        fieldErrors.embedding?.[0] ??
        fieldErrors.action?.[0] ??
        fieldErrors.latitude?.[0] ??
        fallback;

    return new ApiError(message, status, fieldErrors);
}

export async function fetchInternTimeStatus(
    token: string,
): Promise<InternTimeStatusResponse> {
    const url = `${getApiBaseUrl()}/api/intern/time/status`;

    console.log('API request', { method: 'GET', url });

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
        throw buildValidationError(
            payload,
            'Unable to load time status.',
            response.status,
        );
    }

    console.log('Intern time status loaded', {
        faceEnrolled: payload?.face_enrolled,
        canPunchIn: payload?.can_punch_in,
        canPunchOut: payload?.can_punch_out,
    });

    return payload as InternTimeStatusResponse;
}

export async function fetchInternTimeLogs(
    token: string,
): Promise<InternTimeLogsResponse> {
    const url = `${getApiBaseUrl()}/api/intern/time/logs`;

    console.log('API request', { method: 'GET', url });

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
        throw buildValidationError(
            payload,
            'Unable to load time records.',
            response.status,
        );
    }

    console.log('Intern time logs loaded', {
        count: (payload as InternTimeLogsResponse)?.logs?.length ?? 0,
        total: (payload as InternTimeLogsResponse)?.total_count ?? 0,
    });

    return payload as InternTimeLogsResponse;
}

export async function enrollInternFace(
    token: string,
    embedding: number[],
): Promise<InternFaceEnrollResponse> {
    const url = `${getApiBaseUrl()}/api/intern/face/enroll`;

    console.log('API enroll face (embedded 128-D)', {
        url,
        length: embedding.length,
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ embedding }),
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
        throw buildValidationError(
            payload,
            'Face enrollment failed. Please try again.',
            response.status,
        );
    }

    return payload as InternFaceEnrollResponse;
}

export type PunchLocation = {
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
};

export async function punchInternTime(
    token: string,
    action: 'time_in' | 'time_out',
    embedding: number[],
    deviceInfo?: string,
    location?: PunchLocation | null,
): Promise<InternTimePunchResponse> {
    const url = `${getApiBaseUrl()}/api/intern/time/punch`;

    console.log('API time punch (embedded 128-D)', {
        url,
        action,
        length: embedding.length,
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            action,
            embedding,
            ...(deviceInfo ? { device_info: deviceInfo } : {}),
            ...(location
                ? {
                      latitude: location.latitude,
                      longitude: location.longitude,
                      ...(location.accuracyMeters != null
                          ? {
                                location_accuracy_meters:
                                    location.accuracyMeters,
                            }
                          : {}),
                  }
                : {}),
        }),
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
        throw buildValidationError(
            payload,
            'Time punch failed. Please try again.',
            response.status,
        );
    }

    return payload as InternTimePunchResponse;
}
