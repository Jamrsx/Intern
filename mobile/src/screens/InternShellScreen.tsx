import { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { InternBottomNav } from '../components/InternBottomNav';
import type { InternTab } from '../navigation/types';
import { colors } from '../theme/colors';
import type { StoredSession } from '../types/auth';
import { useDocumentAlertPolling } from '../hooks/useDocumentAlertPolling';
import { DocumentsScreen } from './DocumentsScreen';
import { HomeScreen } from './HomeScreen';
import { ProfileScreen } from './ProfileScreen';
import { TimeScreen } from './TimeScreen';

type Props = {
    session: StoredSession;
    onLogout: () => void;
};

export function InternShellScreen({ session, onLogout }: Props) {
    const [activeTab, setActiveTab] = useState<InternTab>('home');
    const [docsBadgeCount, setDocsBadgeCount] = useState(0);

    const handleDocsBadgeChange = useCallback((count: number) => {
        setDocsBadgeCount(count);
    }, []);

    const { refreshAlerts, acknowledgeSeen } = useDocumentAlertPolling(
        session.accessToken,
        handleDocsBadgeChange,
    );

    const renderScreen = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <HomeScreen
                        session={session}
                        documentAlertCount={docsBadgeCount}
                        onAcknowledgeSeen={acknowledgeSeen}
                        onAlertsRefresh={refreshAlerts}
                        onGoToDocuments={() => setActiveTab('documents')}
                    />
                );
            case 'time':
                return <TimeScreen />;
            case 'documents':
                return (
                    <DocumentsScreen
                        session={session}
                        onAcknowledgeSeen={acknowledgeSeen}
                        onAlertsRefresh={refreshAlerts}
                        onBadgeCountChange={handleDocsBadgeChange}
                    />
                );
            case 'profile':
                return (
                    <ProfileScreen session={session} onLogout={onLogout} />
                );
            default:
                return <HomeScreen session={session} />;
        }
    };

    return (
        <View style={styles.shell}>
            <View style={styles.content}>{renderScreen()}</View>
            <InternBottomNav
                activeTab={activeTab}
                onTabPress={setActiveTab}
                docsBadgeCount={docsBadgeCount}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    shell: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? 24 : 32,
    },
    content: {
        flex: 1,
    },
});
