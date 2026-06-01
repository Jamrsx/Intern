import { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SadFaceIcon } from './SadFaceIcon';
import { colors } from '../theme/colors';

type Props = {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
};

export function LogoutConfirmModal({ visible, onClose, onConfirm }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }

        onClose();
    };

    const handleConfirm = async () => {
        setIsSubmitting(true);

        try {
            console.log('Logout confirmed via modal');
            await onConfirm();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <Pressable
                    style={styles.backdrop}
                    onPress={handleClose}
                    disabled={isSubmitting}
                />
                <View style={styles.card}>
                    <View style={styles.iconWrap}>
                        <SadFaceIcon size={30} color={colors.brand} />
                    </View>

                    <Text style={styles.title}>Sign out?</Text>
                    <Text style={styles.subtitle}>
                        You will need your student ID and password to sign in
                        again.
                    </Text>

                    <View style={styles.actions}>
                        <Pressable
                            onPress={handleClose}
                            disabled={isSubmitting}
                            style={({ pressed }) => [
                                styles.secondaryButton,
                                pressed && styles.buttonPressed,
                            ]}
                        >
                            <Text style={styles.secondaryButtonText}>
                                Cancel
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={handleConfirm}
                            disabled={isSubmitting}
                            style={({ pressed }) => [
                                styles.primaryButton,
                                pressed && styles.buttonPressed,
                                isSubmitting && styles.buttonDisabled,
                            ]}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator
                                    color={colors.brandForeground}
                                />
                            ) : (
                                <Text style={styles.primaryButtonText}>
                                    Sign out
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        zIndex: 50,
    },
    backdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(24, 79, 185, 0.25)',
    },
    card: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 18,
        backgroundColor: colors.background,
        padding: 22,
        borderWidth: 1,
        borderColor: colors.brandMuted,
        alignItems: 'center',
        ...Platform.select({
            android: { elevation: 8 },
            ios: {
                shadowColor: colors.brand,
                shadowOpacity: 0.18,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
            },
        }),
    },
    iconWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.brandMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
    },
    subtitle: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 20,
        color: colors.textMuted,
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 22,
        width: '100%',
    },
    secondaryButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    primaryButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.brand,
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.brandForeground,
    },
    buttonPressed: {
        opacity: 0.9,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
});
