import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {
    deleteTimeLogTaskPhoto,
    uploadTimeLogTaskPhoto,
} from '../api/time';
import { ApiError } from '../api/client';
import { colors } from '../theme/colors';
import type { TimeLogTaskPhoto } from '../types/time';
import { forgetTaskPhotoPreview, rememberTaskPhotoPreviewUri } from '../services/taskPhotoPreviewCache';
import { TaskPhotoCameraModal } from './TaskPhotoCameraModal';
import { TaskPhotoThumbnail } from './TaskPhotoThumbnail';

type Props = {
    accessToken: string;
    timeLogId: number;
    sessionPeriod?: 'morning' | 'afternoon' | null;
    initialPhotos?: TimeLogTaskPhoto[];
    onPhotosChange?: (photos: TimeLogTaskPhoto[]) => void;
};

function sessionLabel(period?: 'morning' | 'afternoon' | null): string {
    if (period === 'morning') {
        return 'Morning session';
    }

    if (period === 'afternoon') {
        return 'Afternoon session';
    }

    return 'Current session';
}

function buildUploadFile(uri: string) {
    const name = `task-${Date.now()}.jpg`;

    return {
        uri,
        name,
        type: 'image/jpeg',
    };
}

function mergePhotoLists(
    serverPhotos: TimeLogTaskPhoto[],
    localPhotos: TimeLogTaskPhoto[],
): TimeLogTaskPhoto[] {
    const localById = new Map(
        localPhotos.map((photo) => [photo.id, photo.local_uri]),
    );

    return serverPhotos.map((photo) => ({
        ...photo,
        local_uri: photo.local_uri ?? localById.get(photo.id),
    }));
}

export function SessionTaskPhotos({
    accessToken,
    timeLogId,
    sessionPeriod,
    initialPhotos = [],
    onPhotosChange,
}: Props) {
    const [photos, setPhotos] = useState<TimeLogTaskPhoto[]>(initialPhotos);
    const [showCamera, setShowCamera] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const initialPhotosKey = useMemo(
        () =>
            initialPhotos
                .map(
                    (photo) =>
                        `${photo.id}:${photo.image_url ?? ''}:${photo.status}`,
                )
                .join('|'),
        [initialPhotos],
    );

    useEffect(() => {
        setPhotos((current) => mergePhotoLists(initialPhotos, current));
        console.log('Session task photos synced from server', {
            timeLogId,
            count: initialPhotos.length,
            withImageUrl: initialPhotos.filter((photo) => photo.image_url)
                .length,
        });
    }, [timeLogId, initialPhotosKey, initialPhotos]);

    const sessionTitle = useMemo(
        () => sessionLabel(sessionPeriod),
        [sessionPeriod],
    );

    const syncPhotos = useCallback(
        (next: TimeLogTaskPhoto[]) => {
            setPhotos(next);
            onPhotosChange?.(next);
        },
        [onPhotosChange],
    );

    const handleCaptured = useCallback(
        async (uri: string) => {
            setIsUploading(true);
            setErrorMessage(null);

            try {
                const response = await uploadTimeLogTaskPhoto(
                    accessToken,
                    timeLogId,
                    buildUploadFile(uri),
                );

                const nextPhoto: TimeLogTaskPhoto = {
                    ...response.photo,
                    local_uri: uri,
                };

                rememberTaskPhotoPreviewUri(nextPhoto.id, uri);
                syncPhotos([...photos, nextPhoto]);
                console.log('Session task photo added', {
                    timeLogId,
                    photoId: nextPhoto.id,
                    imageUrl: nextPhoto.image_url,
                    count: photos.length + 1,
                });
            } catch (error) {
                const message =
                    error instanceof ApiError
                        ? error.message
                        : 'Could not upload task photo.';
                setErrorMessage(message);
                console.log('Task photo upload failed', error);
            } finally {
                setIsUploading(false);
            }
        },
        [accessToken, photos, syncPhotos, timeLogId],
    );

    const handleRemove = useCallback(
        async (photo: TimeLogTaskPhoto) => {
            setRemovingId(photo.id);
            setErrorMessage(null);

            try {
                await deleteTimeLogTaskPhoto(
                    accessToken,
                    timeLogId,
                    photo.id,
                );

                syncPhotos(photos.filter((item) => item.id !== photo.id));
                forgetTaskPhotoPreview(photo.id);
                console.log('Session task photo removed', { photoId: photo.id });
            } catch (error) {
                const message =
                    error instanceof ApiError
                        ? error.message
                        : 'Could not remove task photo.';
                setErrorMessage(message);
                console.log('Task photo delete failed', error);
            } finally {
                setRemovingId(null);
            }
        },
        [accessToken, photos, syncPhotos, timeLogId],
    );

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.headerCopy}>
                    <Text style={styles.title}>Task photos</Text>
                    <Text style={styles.subtitle}>
                        {sessionTitle} · Add photos of what you are working on.
                        They are submitted when you time out.
                    </Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{photos.length}</Text>
                </View>
            </View>

            {photos.length === 0 ? (
                <Text style={styles.emptyText}>
                    No task photos yet. Add at least one before timing out.
                </Text>
            ) : (
                <View style={styles.photoGrid}>
                    {photos.map((photo) => (
                        <View key={photo.id} style={styles.photoTile}>
                            <TaskPhotoThumbnail
                                photo={photo}
                                accessToken={accessToken}
                            />
                            <Pressable
                                    style={styles.removeButton}
                                    onPress={() => void handleRemove(photo)}
                                    disabled={removingId === photo.id}
                                >
                                    {removingId === photo.id ? (
                                        <ActivityIndicator
                                            size="small"
                                            color="#fff"
                                        />
                                    ) : (
                                        <Text style={styles.removeButtonText}>
                                            ×
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        ))}
                </View>
            )}

            {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <Pressable
                style={[
                    styles.addButton,
                    (isUploading || photos.length >= 10) &&
                        styles.addButtonDisabled,
                ]}
                onPress={() => setShowCamera(true)}
                disabled={isUploading || photos.length >= 10}
            >
                {isUploading ? (
                    <ActivityIndicator color={colors.brand} />
                ) : (
                    <Text style={styles.addButtonText}>
                        {photos.length >= 10
                            ? 'Photo limit reached (10)'
                            : 'Add task photo'}
                    </Text>
                )}
            </Pressable>

            <TaskPhotoCameraModal
                visible={showCamera}
                onClose={() => setShowCamera(false)}
                onCaptured={(uri) => void handleCaptured(uri)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    headerCopy: {
        flex: 1,
        gap: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 19,
        color: colors.textMuted,
    },
    countBadge: {
        minWidth: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    countBadgeText: {
        color: colors.brandForeground,
        fontSize: 13,
        fontWeight: '700',
    },
    emptyText: {
        fontSize: 13,
        lineHeight: 19,
        color: colors.textMuted,
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    photoTile: {
        width: 88,
        height: 88,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: colors.background,
    },
    removeButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButtonText: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 18,
        fontWeight: '700',
    },
    errorText: {
        fontSize: 13,
        color: colors.error,
        lineHeight: 18,
    },
    addButton: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.brand,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F3FF',
    },
    addButtonDisabled: {
        opacity: 0.6,
    },
    addButtonText: {
        color: colors.brand,
        fontSize: 15,
        fontWeight: '600',
    },
});
