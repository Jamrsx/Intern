import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    StatusBar,
    StyleSheet,
    View,
} from 'react-native';
import { fetchCurrentUser } from './src/api/auth';
import { clearSession, getSession, saveSession } from './src/storage/authStorage';
import { LoginScreen } from './src/screens/LoginScreen';
import { InternShellScreen } from './src/screens/InternShellScreen';
import { colors } from './src/theme/colors';
import type { StoredSession } from './src/types/auth';

function BootScreen() {
    return (
        <View style={styles.bootContainer}>
            <ActivityIndicator size="large" color={colors.brand} />
        </View>
    );
}

export default function App() {
    const [session, setSession] = useState<StoredSession | null>(null);
    const [isBootstrapping, setIsBootstrapping] = useState(true);

    useEffect(() => {
        StatusBar.setHidden(true);
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');

        if (Platform.OS === 'android') {
            StatusBar.setBarStyle('light-content');
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const restoreSession = async () => {
            const storedSession = await getSession();

            if (!storedSession) {
                if (isMounted) {
                    setIsBootstrapping(false);
                }

                return;
            }

            try {
                const user = await fetchCurrentUser(storedSession.accessToken);
                const refreshedSession = { ...storedSession, user };

                await saveSession(refreshedSession);

                if (isMounted) {
                    setSession(refreshedSession);
                    console.log('Session restored', { userId: user.id });
                }
            } catch (error) {
                console.log('Stored session invalid, clearing', error);
                await clearSession();
            } finally {
                if (isMounted) {
                    setIsBootstrapping(false);
                }
            }
        };

        restoreSession();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleLoginSuccess = useCallback(async (nextSession: StoredSession) => {
        await saveSession(nextSession);
        setSession(nextSession);
    }, []);

    const handleLogout = useCallback(async () => {
        await clearSession();
        setSession(null);
    }, []);

    let content = <BootScreen />;

    if (!isBootstrapping) {
        content = session ? (
            <InternShellScreen session={session} onLogout={handleLogout} />
        ) : (
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
        );
    }

    return (
        <>
            <StatusBar
                hidden
                translucent
                backgroundColor="transparent"
                barStyle="light-content"
            />
            {content}
        </>
    );
}

const styles = StyleSheet.create({
    bootContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
});
