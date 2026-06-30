import { getApiBaseUrl } from '../config/api.environment';
import { ApiError } from './client';
import ReactNativeBlobUtil from 'react-native-blob-util';
import type { ImageSourcePropType } from 'react-native';
import type {
    InternFaceEnrollResponse,
    InternTimeLogsResponse,
    InternTimePunchResponse,
    InternTimeStatusResponse,
    PickedTaskPhoto,
    TimeLogTaskPhoto,
    UploadTimeLogTaskPhotoResponse,
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
        fieldErrors.task_photos?.[0] ??
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

export async function uploadTimeLogTaskPhoto(
    token: string,
    timeLogId: number,
    file: PickedTaskPhoto,
): Promise<UploadTimeLogTaskPhotoResponse> {
    const url = `${getApiBaseUrl()}/api/intern/time/logs/${timeLogId}/task-photos`;
    const filePath = file.uri.startsWith('file://')
        ? file.uri
        : `file://${file.uri}`;

    console.log('API upload task photo', {
        url,
        timeLogId,
        filename: file.name,
        filePath,
    });

    const response = await ReactNativeBlobUtil.fetch(
        'POST',
        url,
        {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'multipart/form-data',
        },
        [
            {
                name: 'file',
                filename: file.name,
                type: file.type,
                data: ReactNativeBlobUtil.wrap(filePath),
            },
        ],
    );

    const status = response.info().status;
    const rawBody = await response.text();
    let payload: Record<string, unknown> | null = null;

    try {
        payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
        payload = null;
    }

    if (status < 200 || status >= 300) {
        console.log('Task photo upload failed', {
            status,
            body: rawBody.slice(0, 300),
        });
        throw buildValidationError(
            payload,
            'Unable to upload task photo.',
            status,
        );
    }

    console.log('Task photo uploaded', {
        id: (payload as UploadTimeLogTaskPhotoResponse | null)?.photo?.id,
        fileSize: (payload as UploadTimeLogTaskPhotoResponse | null)?.photo
            ?.file_size,
    });

    return payload as UploadTimeLogTaskPhotoResponse;
}

export async function deleteTimeLogTaskPhoto(
    token: string,
    timeLogId: number,
    photoId: number,
): Promise<void> {
    const url = `${getApiBaseUrl()}/api/intern/time/logs/${timeLogId}/task-photos/${photoId}`;

    console.log('API delete task photo', { url, timeLogId, photoId });

    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
        throw buildValidationError(
            payload,
            'Unable to remove task photo.',
            response.status,
        );
    }

    console.log('Task photo deleted', { photoId });
}

export function buildTaskPhotoImageSource(
    photo: TimeLogTaskPhoto,
    accessToken: string,
): ImageSourcePropType | null {
    if (photo.time_log_id && photo.id) {
        return {
            uri: `${getApiBaseUrl()}/api/intern/time/logs/${photo.time_log_id}/task-photos/${photo.id}`,
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        };
    }

    if (photo.local_uri) {
        return { uri: photo.local_uri };
    }

    return null;
}
