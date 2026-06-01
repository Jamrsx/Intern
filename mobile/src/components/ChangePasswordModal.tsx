import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { ApiError } from '../api/client';
import { updateInternPassword } from '../api/intern';
import { colors } from '../theme/colors';

type Props = {
    visible: boolean;
    accessToken: string;
    onClose: () => void;
    onSuccess: (message: string) => void;
};

export function ChangePasswordModal({
    visible,
    accessToken,
    onClose,
    onSuccess,
}: Props) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const resetForm = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setErrorMessage(null);
        setShowCurrent(false);
        setShowNew(false);
    };

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }

        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setErrorMessage('Please fill in all password fields.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMessage('New password and confirmation do not match.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const response = await updateInternPassword(accessToken, {
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: confirmPassword,
            });

            resetForm();
            onSuccess(response.message);
            onClose();
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(
                    error.fieldErrors.current_password?.[0] ??
                        error.fieldErrors.password?.[0] ??
                        error.message,
                );
            } else if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage('Unable to update password. Try again.');
            }
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
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Pressable style={styles.backdrop} onPress={handleClose} />
                <View style={styles.card}>
                    <Text style={styles.title}>Change password</Text>
                    <Text style={styles.subtitle}>
                        Use a strong password you do not use elsewhere.
                    </Text>

                    <PasswordField
                        label="Current password"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secure={!showCurrent}
                        onToggleSecure={() => setShowCurrent(value => !value)}
                        showSecure={showCurrent}
                    />
                    <PasswordField
                        label="New password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secure={!showNew}
                        onToggleSecure={() => setShowNew(value => !value)}
                        showSecure={showNew}
                    />
                    <PasswordField
                        label="Confirm new password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secure={!showNew}
                        onToggleSecure={() => setShowNew(value => !value)}
                        showSecure={showNew}
                    />

                    {errorMessage ? (
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    ) : null}

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
                            onPress={handleSubmit}
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
                                    Update
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

type PasswordFieldProps = {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    secure: boolean;
    showSecure: boolean;
    onToggleSecure: () => void;
};

function PasswordField({
    label,
    value,
    onChangeText,
    secure,
    showSecure,
    onToggleSecure,
}: PasswordFieldProps) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.inputRow}>
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={secure}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    placeholderTextColor={colors.textSubtle}
                />
                <Pressable
                    onPress={onToggleSecure}
                    hitSlop={8}
                    style={styles.toggleButton}
                >
                    <Text style={styles.toggleText}>
                        {showSecure ? 'Hide' : 'Show'}
                    </Text>
                </Pressable>
            </View>
        </View>
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
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    card: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 18,
        backgroundColor: colors.background,
        padding: 22,
        borderWidth: 1,
        borderColor: colors.border,
        ...Platform.select({
            android: { elevation: 8 },
            ios: {
                shadowColor: '#0F172A',
                shadowOpacity: 0.15,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
            },
        }),
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    subtitle: {
        marginTop: 6,
        fontSize: 14,
        lineHeight: 20,
        color: colors.textMuted,
    },
    field: {
        marginTop: 16,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
    },
    input: {
        flex: 1,
        minHeight: 48,
        fontSize: 15,
        color: colors.text,
    },
    toggleButton: {
        paddingVertical: 8,
        paddingLeft: 8,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.brand,
    },
    errorText: {
        marginTop: 12,
        fontSize: 13,
        lineHeight: 18,
        color: colors.error,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 22,
    },
    secondaryButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
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
