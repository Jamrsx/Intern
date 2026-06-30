import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
} from 'react-native-vision-camera';
import { colors } from '../theme/colors';

type Props = {
    visible: boolean;
    onClose: () => void;
    onCaptured: (uri: string) => void;
};

export function TaskPhotoCameraModal({ visible, onClose, onCaptured }: Props) {
    const cameraRef = useRef<Camera>(null);
    const device = useCameraDevice('back');
    const { hasPermission, requestPermission } = useCameraPermission();
    const [isCapturing, setIsCapturing] = useState(false);

    const ensurePermission = useCallback(async () => {
        if (hasPermission) {
            return true;
        }

        const granted = await requestPermission();
        console.log('Task photo camera permission', { granted });

        return granted;
    }, [hasPermission, requestPermission]);

    const handleCapture = useCallback(async () => {
        if (isCapturing || !cameraRef.current) {
            return;
        }

        const permitted = await ensurePermission();

        if (!permitted) {
            return;
        }

        setIsCapturing(true);

        try {
            const photo = await cameraRef.current.takePhoto({
                flash: 'off',
                enableShutterSound: true,
                qualityPrioritization: 'balanced',
            });

            const uri =
                Platform.OS === 'android'
                    ? `file://${photo.path}`
                    : photo.path;

            console.log('Task photo captured', { uri });
            onCaptured(uri);
            onClose();
        } catch (error) {
            console.log('Task photo capture failed', error);
        } finally {
            setIsCapturing(false);
        }
    }, [ensurePermission, isCapturing, onCaptured, onClose]);

    if (!visible) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                {!hasPermission ? (
                    <View style={styles.permissionBlock}>
                        <Text style={styles.permissionTitle}>
                            Camera access needed
                        </Text>
                        <Text style={styles.permissionText}>
                            Allow camera access to photograph your internship
                            tasks.
                        </Text>
                        <Pressable
                            style={styles.primaryButton}
                            onPress={() => void ensurePermission()}
                        >
                            <Text style={styles.primaryButtonText}>
                                Allow camera
                            </Text>
                        </Pressable>
                    </View>
                ) : device == null ? (
                    <View style={styles.permissionBlock}>
                        <ActivityIndicator size="large" color={colors.brand} />
                        <Text style={styles.permissionText}>
                            Loading camera…
                        </Text>
                    </View>
                ) : (
                    <Camera
                        ref={cameraRef}
                        style={styles.camera}
                        device={device}
                        isActive={visible}
                        photo
                    />
                )}

                <View style={styles.controls}>
                    <Pressable style={styles.secondaryButton} onPress={onClose}>
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </Pressable>

                    {device != null && hasPermission ? (
                        <Pressable
                            style={[
                                styles.captureButton,
                                isCapturing && styles.captureButtonDisabled,
                            ]}
                            onPress={() => void handleCapture()}
                            disabled={isCapturing}
                        >
                            {isCapturing ? (
                                <ActivityIndicator color={colors.brand} />
                            ) : (
                                <View style={styles.captureButtonInner} />
                            )}
                        </Pressable>
                    ) : (
                        <View style={styles.capturePlaceholder} />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    permissionBlock: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        gap: 12,
        backgroundColor: colors.background,
    },
    permissionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: 14,
        lineHeight: 21,
        color: colors.textMuted,
        textAlign: 'center',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 20,
        backgroundColor: '#111',
    },
    primaryButton: {
        backgroundColor: colors.brand,
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginTop: 8,
    },
    primaryButtonText: {
        color: colors.brandForeground,
        fontSize: 15,
        fontWeight: '600',
    },
    secondaryButton: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    captureButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureButtonDisabled: {
        opacity: 0.6,
    },
    captureButtonInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#fff',
    },
    capturePlaceholder: {
        width: 72,
        height: 72,
    },
});
