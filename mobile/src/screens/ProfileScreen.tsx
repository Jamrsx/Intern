import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { logout } from '../api/auth';
import { ApiError } from '../api/client';
import { fetchInternProfile } from '../api/intern';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { LogoutConfirmModal } from '../components/LogoutConfirmModal';
import { colors } from '../theme/colors';
import type { StoredSession } from '../types/auth';
import type { InternProfileResponse } from '../types/profile';

type Props = {
    session: StoredSession;
    onLogout: () => void;
};

const AVATAR_SIZE = 60;
const ROW_GAP = 14;

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return '?';
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function CardDivider() {
    return <View style={styles.cardDivider} />;
}

function InfoBlock({
    label,
    value,
    lines,
}: {
    label: string;
    value: string;
    lines?: string[];
}) {
    const detailLines =
        lines?.filter(line => line.trim().length > 0) ?? [];

    return (
        <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
            {detailLines.map(line => (
                <Text key={line} style={styles.infoHint}>
                    {line}
                </Text>
            ))}
        </View>
    );
}

export function ProfileScreen({ session, onLogout }: Props) {
    const [profile, setProfile] = useState<InternProfileResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetchInternProfile(session.accessToken);
            setProfile(response);
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
            } else if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage('Unable to load your profile.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [session.accessToken]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const displayName = profile?.student.full_name ?? session.user.name;
    const studentNumber = profile?.student.student_number ?? '—';
    const initials = useMemo(() => getInitials(displayName), [displayName]);
    const chipsIndent = AVATAR_SIZE + ROW_GAP;

    const notAssigned = 'Not assigned yet';

    const supervisorLines = useMemo(() => {
        const supervisor = profile?.placement.supervisor;

        if (!supervisor) {
            return [];
        }

        return [
            supervisor.position_title,
            supervisor.email,
        ].filter((line): line is string => Boolean(line?.trim()));
    }, [profile?.placement.supervisor]);

    const performLogout = useCallback(async () => {
        try {
            await logout(session.accessToken);
        } catch (error) {
            console.log('Logout API failed, clearing local session anyway', error);
        }

        onLogout();
    }, [onLogout, session.accessToken]);

    const handleLogoutPress = useCallback(() => {
        setShowLogoutModal(true);
    }, []);

    const handlePasswordSuccess = (message: string) => {
        setSuccessMessage(message);
        console.log('Password change success', { message });
    };

    return (
        <View style={styles.screen}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.heroCard}>
                    <View style={styles.heroRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>

                        <View style={styles.heroTextColumn}>
                            <Text style={styles.heroName} numberOfLines={2}>
                                {displayName}
                            </Text>
                            <Text style={styles.heroMeta}>
                                ID {studentNumber}
                            </Text>
                            <Text style={styles.heroEmail} numberOfLines={2}>
                                {session.user.email}
                            </Text>
                        </View>
                    </View>

                    {session.user.role?.label || profile?.section ? (
                        <View
                            style={[
                                styles.heroChips,
                                { marginLeft: chipsIndent },
                            ]}
                        >
                            {session.user.role?.label ? (
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleBadgeText}>
                                        {session.user.role.label}
                                    </Text>
                                </View>
                            ) : null}
                            {profile?.section ? (
                                <View style={styles.sectionBadge}>
                                    <Text style={styles.sectionBadgeText}>
                                        {profile.section.course?.code ?? 'Section'}{' '}
                                        · {profile.section.name}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    ) : null}
                </View>

                {successMessage ? (
                    <View style={styles.successBanner}>
                        <Text style={styles.successText}>{successMessage}</Text>
                    </View>
                ) : null}

                {isLoading ? (
                    <View style={styles.stateCard}>
                        <ActivityIndicator size="large" color={colors.brand} />
                        <Text style={styles.stateText}>Loading profile…</Text>
                    </View>
                ) : null}

                {!isLoading && errorMessage ? (
                    <View style={styles.stateCard}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                        <Pressable onPress={loadProfile} style={styles.retryButton}>
                            <Text style={styles.retryButtonText}>Try again</Text>
                        </Pressable>
                    </View>
                ) : null}

                {!isLoading && profile && !errorMessage ? (
                    <>
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>OJT placement</Text>

                            <View style={styles.infoList}>
                                <InfoBlock
                                    label="Company"
                                    value={
                                        profile.placement.company?.name ??
                                        notAssigned
                                    }
                                    lines={
                                        profile.placement.company?.address
                                            ? [profile.placement.company.address]
                                            : undefined
                                    }
                                />
                                <CardDivider />
                                <InfoBlock
                                    label="Department"
                                    value={
                                        profile.placement.department?.name ??
                                        notAssigned
                                    }
                                />
                                <CardDivider />
                                <InfoBlock
                                    label="Supervisor"
                                    value={
                                        profile.placement.supervisor?.name ??
                                        notAssigned
                                    }
                                    lines={
                                        supervisorLines.length > 0
                                            ? supervisorLines
                                            : undefined
                                    }
                                />
                            </View>
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Security</Text>
                            <Pressable
                                onPress={() => setShowPasswordModal(true)}
                                style={({ pressed }) => [
                                    styles.actionRow,
                                    pressed && styles.actionRowPressed,
                                ]}
                            >
                                <View style={styles.actionCopy}>
                                    <Text style={styles.actionTitle}>
                                        Change password
                                    </Text>
                                    <Text style={styles.actionSubtitle}>
                                        Update your sign-in password
                                    </Text>
                                </View>
                                <View style={styles.chevronWrap}>
                                    <Text style={styles.actionChevron}>›</Text>
                                </View>
                            </Pressable>
                        </View>
                    </>
                ) : null}

                <Pressable
                    onPress={handleLogoutPress}
                    style={({ pressed }) => [
                        styles.logoutButton,
                        pressed && styles.logoutButtonPressed,
                    ]}
                >
                    <Text style={styles.logoutButtonText}>Sign out</Text>
                </Pressable>
            </ScrollView>

            <ChangePasswordModal
                visible={showPasswordModal}
                accessToken={session.accessToken}
                onClose={() => setShowPasswordModal(false)}
                onSuccess={handlePasswordSuccess}
            />

            <LogoutConfirmModal
                visible={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={performLogout}
            />
        </View>
    );
}

const textDefaults = Platform.select({
    android: { includeFontPadding: false as const },
    default: {},
});

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 28,
    },
    heroCard: {
        borderRadius: 18,
        backgroundColor: colors.brand,
        padding: 18,
        marginBottom: 16,
        ...Platform.select({
            android: { elevation: 4 },
            ios: {
                shadowColor: '#0F172A',
                shadowOpacity: 0.12,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
            },
        }),
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: ROW_GAP,
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.35)',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.brandForeground,
        ...textDefaults,
    },
    heroTextColumn: {
        flex: 1,
        minWidth: 0,
        gap: 6,
        paddingTop: 2,
    },
    heroName: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.brandForeground,
        lineHeight: 24,
        ...textDefaults,
    },
    heroMeta: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.95)',
        lineHeight: 20,
        ...textDefaults,
    },
    heroEmail: {
        fontSize: 13,
        lineHeight: 18,
        color: 'rgba(255, 255, 255, 0.85)',
        ...textDefaults,
    },
    heroChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginTop: 14,
    },
    roleBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    roleBadgeText: {
        color: colors.brandForeground,
        fontSize: 12,
        fontWeight: '600',
        ...textDefaults,
    },
    sectionBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    sectionBadgeText: {
        color: 'rgba(255, 255, 255, 0.92)',
        fontSize: 12,
        fontWeight: '600',
        ...textDefaults,
    },
    successBanner: {
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: '#ECFDF3',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        padding: 12,
    },
    successText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.success,
        textAlign: 'center',
        ...textDefaults,
    },
    stateCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.surface,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    stateText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textMuted,
        ...textDefaults,
    },
    errorText: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.error,
        textAlign: 'center',
        ...textDefaults,
    },
    retryButton: {
        marginTop: 14,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.brand,
    },
    retryButtonText: {
        color: colors.brandForeground,
        fontSize: 14,
        fontWeight: '700',
        ...textDefaults,
    },
    sectionCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.surface,
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
        ...textDefaults,
    },
    infoList: {
        width: '100%',
    },
    infoBlock: {
        width: '100%',
        gap: 5,
    },
    infoLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSubtle,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        lineHeight: 14,
        ...textDefaults,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 22,
        ...textDefaults,
    },
    infoHint: {
        fontSize: 13,
        lineHeight: 18,
        color: colors.textMuted,
        ...textDefaults,
    },
    cardDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginVertical: 14,
        alignSelf: 'stretch',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    actionRowPressed: {
        opacity: 0.85,
    },
    actionCopy: {
        flex: 1,
        minWidth: 0,
        gap: 3,
        paddingRight: 8,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 22,
        ...textDefaults,
    },
    actionSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        color: colors.textMuted,
        ...textDefaults,
    },
    chevronWrap: {
        width: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionChevron: {
        fontSize: 24,
        lineHeight: 24,
        color: colors.textSubtle,
        fontWeight: '300',
        textAlign: 'center',
        ...textDefaults,
    },
    logoutButton: {
        marginTop: 8,
        minHeight: 52,
        borderRadius: 12,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutButtonPressed: {
        backgroundColor: colors.surface,
    },
    logoutButtonText: {
        color: colors.error,
        fontSize: 16,
        fontWeight: '700',
        ...textDefaults,
    },
});
