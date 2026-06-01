import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { logout } from '../api/auth';
import { OccLogoMark } from '../components/OccLogoMark';
import { colors } from '../theme/colors';
import type { StoredSession } from '../types/auth';

type Props = {
    session: StoredSession;
    onLogout: () => void;
};

export function ProfileScreen({ session, onLogout }: Props) {
    const handleLogout = async () => {
        try {
            await logout(session.accessToken);
        } catch (error) {
            console.log('Logout API failed, clearing local session anyway', error);
        }

        onLogout();
    };

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <OccLogoMark size={56} />
                <Text style={styles.name}>{session.user.name}</Text>
                <Text style={styles.email}>{session.user.email}</Text>
                {session.user.role?.label ? (
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>
                            {session.user.role.label}
                        </Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Account</Text>
                <Text style={styles.infoValue}>
                    Use this app for OJT time logging and document uploads.
                </Text>
            </View>

            <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                    styles.logoutButton,
                    pressed && styles.logoutButtonPressed,
                ]}
            >
                <Text style={styles.logoutButtonText}>Sign out</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    name: {
        marginTop: 16,
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
    },
    email: {
        marginTop: 6,
        fontSize: 14,
        color: colors.textMuted,
    },
    roleBadge: {
        marginTop: 12,
        backgroundColor: colors.brandMuted,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    roleBadgeText: {
        color: colors.brand,
        fontSize: 13,
        fontWeight: '600',
    },
    infoCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.surface,
        padding: 16,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    infoValue: {
        marginTop: 8,
        fontSize: 15,
        lineHeight: 22,
        color: colors.text,
    },
    logoutButton: {
        marginTop: 'auto',
        minHeight: 52,
        borderRadius: 12,
        backgroundColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            android: { marginBottom: 8 },
            ios: {},
        }),
    },
    logoutButtonPressed: {
        backgroundColor: colors.brandHover,
    },
    logoutButtonText: {
        color: colors.brandForeground,
        fontSize: 16,
        fontWeight: '700',
    },
});
