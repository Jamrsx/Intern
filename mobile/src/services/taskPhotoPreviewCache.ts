import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { getApiBaseUrl } from '../config/api.environment';

const previewUriByPhotoId = new Map<number, string>();

function toDisplayUri(path: string): string {
    if (path.startsWith('file://')) {
        return path;
    }

    return Platform.OS === 'android' ? `file://${path}` : path;
}

export function buildTaskPhotoPreviewUrl(
    timeLogId: number,
    photoId: number,
): string {
    return `${getApiBaseUrl()}/api/intern/time/logs/${timeLogId}/task-photos/${photoId}`;
}

export async function resolveTaskPhotoPreviewUri(
    timeLogId: number,
    photoId: number,
    accessToken: string,
): Promise<string> {
    const cachedUri = previewUriByPhotoId.get(photoId);

    if (cachedUri) {
        const cachedPath = cachedUri.replace(/^file:\/\//, '');
        const exists = await ReactNativeBlobUtil.fs.exists(cachedPath);

        if (exists) {
            return cachedUri;
        }

        previewUriByPhotoId.delete(photoId);
    }

    const url = buildTaskPhotoPreviewUrl(timeLogId, photoId);
    const cachePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/task-photo-${photoId}.jpg`;

    console.log('Fetching task photo preview', { photoId, timeLogId, url });

    const response = await ReactNativeBlobUtil.config({
        fileCache: true,
        path: cachePath,
    }).fetch('GET', url, {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'image/jpeg,image/png,image/webp,image/*',
    });

    const status = response.info().status;

    if (status < 200 || status >= 300) {
        const body = await response.text();
        console.log('Task photo preview fetch failed', {
            photoId,
            status,
            body: body.slice(0, 200),
        });
        throw new Error(`Could not load task photo (${status}).`);
    }

    const savedPath = response.path();
    const displayUri = toDisplayUri(savedPath);
    previewUriByPhotoId.set(photoId, displayUri);

    console.log('Task photo preview cached', {
        photoId,
        savedPath,
        displayUri,
    });

    return displayUri;
}

export function rememberTaskPhotoPreviewUri(
    photoId: number,
    localUri: string,
): void {
    previewUriByPhotoId.set(photoId, localUri);
}

export function forgetTaskPhotoPreview(photoId: number): void {
    previewUriByPhotoId.delete(photoId);
}
