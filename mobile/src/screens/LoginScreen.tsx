import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    type KeyboardEvent,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { ApiError } from '../api/client';
import { login } from '../api/auth';
import {
    getApiBaseUrl,
    getApiEnvironment,
    setApiEnvironment,
    type ApiEnvironment,
} from '../config/api.environment';
import { OccLogoMark } from '../components/OccLogoMark';
import { colors } from '../theme/colors';
import type { StoredSession } from '../types/auth';

type Props = {
    onLoginSuccess: (session: StoredSession) => void;
};

export function LoginScreen({ onLoginSuccess }: Props) {
    const passwordRef = useRef<TextInput>(null);

    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<
        'studentId' | 'password' | null
    >(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [environment, setEnvironment] = useState<ApiEnvironment>(
        getApiEnvironment(),
    );
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const isKeyboardVisible = keyboardHeight > 0;

    useEffect(() => {
        const showEvent =
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent =
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = (event: KeyboardEvent) => {
            setKeyboardHeight(event.endCoordinates.height);
            console.log('Keyboard shown', {
                height: event.endCoordinates.height,
            });
        };

        const onHide = () => {
            setKeyboardHeight(0);
            console.log('Keyboard hidden');
        };

        const showSub = Keyboard.addListener(showEvent, onShow);
        const hideSub = Keyboard.addListener(hideEvent, onHide);

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const handleEnvironmentToggle = (next: ApiEnvironment) => {
        setApiEnvironment(next);
        setEnvironment(next);
        console.log('API environment changed', {
            environment: next,
            baseUrl: getApiBaseUrl(),
        });
    };

    const handleSubmit = async () => {
        Keyboard.dismiss();

        const trimmedStudentId = studentId.trim();

        if (!trimmedStudentId || !password) {
            setErrorMessage('Please enter your student ID and password.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            console.log('Login attempt', {
                studentId: trimmedStudentId,
                environment,
                baseUrl: getApiBaseUrl(),
            });

            const session = await login(trimmedStudentId, password);
            onLoginSuccess(session);
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(
                    error.fieldErrors.student_number?.[0] ??
                        error.fieldErrors.password?.[0] ??
                        error.message,
                );
            } else if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage('Unable to sign in. Check your connection.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={[styles.screen, { paddingBottom: keyboardHeight }]}>
            <Pressable
                style={styles.flex}
                onPress={Keyboard.dismiss}
                accessible={false}
            >
                {!isKeyboardVisible ? (
                    <View style={styles.headerBand}>
                        <View style={styles.logoWrap}>
                            <OccLogoMark size={68} />
                        </View>
                        <Text style={styles.headerTitle}>OCC Intern</Text>
                        <Text style={styles.headerSubtitle}>
                            On-the-Job Training Management System
                        </Text>
                    </View>
                ) : null}

                <View
                    style={[
                        styles.body,
                        isKeyboardVisible && styles.bodyKeyboardOpen,
                    ]}
                >
                    <View
                        style={[
                            styles.formCard,
                            isKeyboardVisible && styles.formCardKeyboardOpen,
                        ]}
                    >
                        <View
                            style={[
                                styles.formHeader,
                                isKeyboardVisible && styles.formHeaderCompact,
                            ]}
                        >
                            <Text style={styles.formTitle}>Sign in</Text>
                            {!isKeyboardVisible ? (
                                <Text style={styles.formDescription}>
                                    Enter your student ID and password to access
                                    your intern account.
                                </Text>
                            ) : null}
                        </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Student ID</Text>
                                <TextInput
                                    value={studentId}
                                    onChangeText={setStudentId}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    textContentType="username"
                                    returnKeyType="next"
                                    blurOnSubmit={false}
                                    onSubmitEditing={() =>
                                        passwordRef.current?.focus()
                                    }
                                    onFocus={() => setFocusedField('studentId')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="Enter your student ID"
                                    placeholderTextColor={colors.textSubtle}
                                    style={[
                                        styles.input,
                                        focusedField === 'studentId' &&
                                            styles.inputFocused,
                                    ]}
                                    editable={!isSubmitting}
                                />
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Password</Text>
                                <View
                                    style={[
                                        styles.passwordRow,
                                        focusedField === 'password' &&
                                            styles.inputFocused,
                                    ]}
                                >
                                    <TextInput
                                        ref={passwordRef}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        textContentType="password"
                                        returnKeyType="done"
                                        onSubmitEditing={handleSubmit}
                                        onFocus={() =>
                                            setFocusedField('password')
                                        }
                                        onBlur={() => setFocusedField(null)}
                                        placeholder="Enter your password"
                                        placeholderTextColor={colors.textSubtle}
                                        style={[
                                            styles.input,
                                            styles.passwordInput,
                                            styles.inputPlain,
                                        ]}
                                        editable={!isSubmitting}
                                    />
                                    <Pressable
                                        onPress={() =>
                                            setShowPassword(
                                                (current) => !current,
                                            )
                                        }
                                        style={styles.showPasswordButton}
                                        hitSlop={8}
                                    >
                                        <Text style={styles.showPasswordText}>
                                            {showPassword ? 'Hide' : 'Show'}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>

                            {errorMessage ? (
                                <View style={styles.errorBox}>
                                    <Text style={styles.errorText}>
                                        {errorMessage}
                                    </Text>
                                </View>
                            ) : null}

                            <Pressable
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                                style={({ pressed }) => [
                                    styles.submitButton,
                                    (pressed || isSubmitting) &&
                                        styles.submitButtonPressed,
                                    isSubmitting && styles.submitButtonDisabled,
                                ]}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator
                                        color={colors.brandForeground}
                                    />
                                ) : (
                                    <Text style={styles.submitButtonText}>
                                        Sign in
                                    </Text>
                                )}
                            </Pressable>

                            {__DEV__ && !isKeyboardVisible ? (
                                <View style={styles.environmentRow}>
                                    <View style={styles.environmentToggle}>
                                        {(
                                            ['local', 'production'] as const
                                        ).map((option) => {
                                            const isActive =
                                                environment === option;

                                            return (
                                                <Pressable
                                                    key={option}
                                                    onPress={() =>
                                                        handleEnvironmentToggle(
                                                            option,
                                                        )
                                                    }
                                                    style={[
                                                        styles.environmentChip,
                                                        isActive &&
                                                            styles.environmentChipActive,
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.environmentChipText,
                                                            isActive &&
                                                                styles.environmentChipTextActive,
                                                        ]}
                                                    >
                                                        {option === 'local'
                                                            ? 'Local'
                                                            : 'Production'}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            ) : null}
                        </View>

                        {!isKeyboardVisible ? (
                            <View style={styles.footer}>
                                <Text style={styles.footerTitle}>
                                    Authorized access only
                                </Text>
                                <Text style={styles.footerNote}>
                                    This application is intended for registered
                                    OJT interns. Faculty and supervisors should
                                    use the web portal.
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.brand,
    },
    flex: {
        flex: 1,
    },
    headerBand: {
        backgroundColor: colors.brand,
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 48 : 56,
        paddingBottom: 32,
        paddingHorizontal: 24,
    },
    logoWrap: {
        padding: 6,
        borderRadius: 18,
        backgroundColor: colors.brandForeground,
    },
    headerTitle: {
        marginTop: 16,
        fontSize: 26,
        fontWeight: '700',
        color: colors.brandForeground,
        letterSpacing: 0.2,
    },
    headerSubtitle: {
        marginTop: 6,
        fontSize: 14,
        lineHeight: 20,
        color: 'rgba(255, 255, 255, 0.82)',
        textAlign: 'center',
        maxWidth: 300,
    },
    body: {
        flex: 1,
        backgroundColor: colors.surface,
        paddingHorizontal: 20,
        paddingBottom: 28,
    },
    bodyKeyboardOpen: {
        paddingTop: Platform.OS === 'android' ? 16 : 24,
        paddingBottom: 12,
        justifyContent: 'flex-start',
    },
    formCard: {
        marginTop: -16,
        backgroundColor: colors.background,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 22,
        shadowColor: '#0F172A',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
    },
    formCardKeyboardOpen: {
        marginTop: 0,
    },
    formHeader: {
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        alignItems: 'center',
    },
    formHeaderCompact: {
        marginBottom: 14,
        paddingBottom: 12,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
    },
    formDescription: {
        marginTop: 6,
        fontSize: 14,
        lineHeight: 21,
        color: colors.textMuted,
        textAlign: 'center',
    },
    environmentRow: {
        marginTop: 18,
        alignItems: 'center',
    },
    environmentToggle: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    environmentChip: {
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        minWidth: 108,
        alignItems: 'center',
    },
    environmentChipActive: {
        borderColor: colors.brand,
        backgroundColor: colors.brandMuted,
    },
    environmentChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
    },
    environmentChipTextActive: {
        color: colors.brand,
    },
    fieldGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 13,
        fontSize: 16,
        color: colors.text,
    },
    inputPlain: {
        borderWidth: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 14,
    },
    inputFocused: {
        borderColor: colors.brand,
        backgroundColor: colors.background,
    },
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        overflow: 'hidden',
    },
    passwordInput: {
        flex: 1,
        paddingRight: 8,
    },
    showPasswordButton: {
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    showPasswordText: {
        color: colors.brand,
        fontSize: 13,
        fontWeight: '700',
    },
    errorBox: {
        backgroundColor: colors.errorBackground,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
        padding: 12,
        marginBottom: 14,
    },
    errorText: {
        color: colors.error,
        fontSize: 14,
        lineHeight: 20,
    },
    submitButton: {
        backgroundColor: colors.brand,
        borderRadius: 12,
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonPressed: {
        backgroundColor: colors.brandHover,
    },
    submitButtonDisabled: {
        opacity: 0.85,
    },
    submitButtonText: {
        color: colors.brandForeground,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    footer: {
        marginTop: 'auto',
        paddingTop: 28,
        paddingBottom: 16,
        paddingHorizontal: 12,
        alignItems: 'center',
        minHeight: 96,
    },
    footerTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    footerNote: {
        marginTop: 8,
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 20,
        color: colors.textSubtle,
        maxWidth: 320,
    },
});
