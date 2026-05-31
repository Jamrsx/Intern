import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { logout } from '../api/auth';
import { getWebLoginUrl } from '../config/api.environment';
import { OccLogoMark } from '../components/OccLogoMark';
import { colors } from '../theme/colors';
import type { StoredSession } from '../types/auth';

type Props = {
    session: StoredSession;
    onLogout: () => void;
};

export function HomeScreen({ session, onLogout }: Props) {
    const handleLogout = async () => {
        try {
            await logout(session.accessToken);
        } catch (error) {
            console.log('Logout API failed, clearing local session anyway', error);
        }

        onLogout();
    };

    const openWebPortal = () => {
        const url = getWebLoginUrl();
        console.log('Opening web portal', { url, platform: Platform.OS });
        Linking.openURL(url).catch((error) => {
            console.log('Failed to open web portal', error);
        });
    };

    return (
        <View style={styles.screen}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <OccLogoMark size={48} />
                    <Text style={styles.greeting}>Welcome, {session.user.name}</Text>
                    <Text style={styles.meta}>{session.user.email}</Text>
                    {session.user.role?.label ? (
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>
                                {session.user.role.label}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.placeholderCard}>
                    <Text style={styles.placeholderTitle}>Home coming next</Text>
                    <Text style={styles.placeholderText}>
                        After login, this screen will show your OJT progress,
                        time in/out, and document uploads.
                    </Text>
                </View>

                {Platform.OS === 'ios' ? (
                    <Pressable onPress={openWebPortal} style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>
                            Open web portal in browser
                        </Text>
                    </Pressable>
                ) : null}

                <Pressable onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={styles.logoutButtonText}>Sign out</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? 24 : 32,
        paddingBottom: 24,
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    greeting: {
        marginTop: 16,
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
    },
    meta: {
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
    placeholderCard: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.surface,
        padding: 20,
        justifyContent: 'center',
    },
    placeholderTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    placeholderText: {
        fontSize: 15,
        lineHeight: 22,
        color: colors.textMuted,
    },
    secondaryButton: {
        marginTop: 16,
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    secondaryButtonText: {
        color: colors.brand,
        fontSize: 15,
        fontWeight: '600',
    },
    logoutButton: {
        marginTop: 12,
        minHeight: 48,
        borderRadius: 12,
        backgroundColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutButtonText: {
        color: colors.brandForeground,
        fontSize: 15,
        fontWeight: '700',
    },
});
