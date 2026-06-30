import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import {
    rememberTaskPhotoPreviewUri,
    resolveTaskPhotoPreviewUri,
} from '../services/taskPhotoPreviewCache';
import type { TimeLogTaskPhoto } from '../types/time';

type Props = {
    photo: TimeLogTaskPhoto;
    accessToken: string;
    style?: StyleProp<ViewStyle>;
};

export function TaskPhotoThumbnail({ photo, accessToken, style }: Props) {
    const [previewUri, setPreviewUri] = useState<string | null>(
        photo.local_uri ?? null,
    );
    const [isLoading, setIsLoading] = useState(!photo.local_uri);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadPreview = async () => {
            if (!photo.time_log_id || !photo.id) {
                setHasError(true);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setHasError(false);

            try {
                const uri = await resolveTaskPhotoPreviewUri(
                    photo.time_log_id,
                    photo.id,
                    accessToken,
                );

                if (!cancelled) {
                    setPreviewUri(uri);
                    setIsLoading(false);
                }
            } catch (error) {
                console.log('Task photo thumbnail load failed', {
                    photoId: photo.id,
                    error,
                });

                if (!cancelled) {
                    if (photo.local_uri) {
                        setPreviewUri(photo.local_uri);
                        setHasError(false);
                    } else {
                        setHasError(true);
                    }
                    setIsLoading(false);
                }
            }
        };

        void loadPreview();

        return () => {
            cancelled = true;
        };
    }, [accessToken, photo.id, photo.local_uri, photo.time_log_id]);

    useEffect(() => {
        if (photo.local_uri && photo.id) {
            rememberTaskPhotoPreviewUri(photo.id, photo.local_uri);
        }
    }, [photo.id, photo.local_uri]);

    if (isLoading && !previewUri) {
        return (
            <View style={[styles.tile, style, styles.centered]}>
                <ActivityIndicator size="small" color={colors.brand} />
            </View>
        );
    }

    if (hasError || !previewUri) {
        return (
            <View style={[styles.tile, style, styles.centered, styles.error]}>
                <Text style={styles.errorText}>!</Text>
            </View>
        );
    }

    return (
        <Image
            source={{ uri: previewUri }}
            style={[styles.tile, style]}
            resizeMode="cover"
            onError={(event) => {
                console.log('Task photo image render failed', {
                    photoId: photo.id,
                    uri: previewUri,
                    error: event.nativeEvent.error,
                });
                setHasError(true);
            }}
        />
    );
}

const styles = StyleSheet.create({
    tile: {
        width: '100%',
        height: '100%',
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E5E7EB',
    },
    error: {
        backgroundColor: colors.errorBackground,
    },
    errorText: {
        color: colors.error,
        fontSize: 18,
        fontWeight: '700',
    },
});
