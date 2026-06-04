import { Pressable, StyleSheet, Text, View } from 'react-native';
import { INTERN_TABS, type InternTab } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = {
    activeTab: InternTab;
    onTabPress: (tab: InternTab) => void;
    docsBadgeCount?: number;
};

export function InternBottomNav({
    activeTab,
    onTabPress,
    docsBadgeCount = 0,
}: Props) {
    return (
        <View style={styles.container}>
            {INTERN_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const showDocsBadge =
                    tab.id === 'documents' && docsBadgeCount > 0;
                const badgeLabel =
                    docsBadgeCount > 9 ? '9+' : String(docsBadgeCount);

                return (
                    <Pressable
                        key={tab.id}
                        onPress={() => {
                            console.log('Bottom nav pressed', { tab: tab.id });
                            onTabPress(tab.id);
                        }}
                        style={({ pressed }) => [
                            styles.tab,
                            isActive && styles.tabActive,
                            pressed && styles.tabPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                    >
                        <View style={styles.tabLabelWrap}>
                            <View
                                style={[
                                    styles.indicator,
                                    isActive && styles.indicatorActive,
                                ]}
                            />
                            {showDocsBadge ? (
                                <View style={styles.tabBadge}>
                                    <Text style={styles.tabBadgeText}>
                                        {badgeLabel}
                                    </Text>
                                </View>
                            ) : null}
                            <Text
                                style={[
                                    styles.label,
                                    isActive && styles.labelActive,
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
        paddingBottom: 8,
        paddingTop: 6,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
        paddingHorizontal: 4,
    },
    tabActive: {
        backgroundColor: colors.brandMuted,
    },
    tabPressed: {
        opacity: 0.85,
    },
    tabLabelWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    indicator: {
        width: 28,
        height: 3,
        borderRadius: 999,
        backgroundColor: 'transparent',
        marginBottom: 6,
    },
    tabBadge: {
        position: 'absolute',
        top: -2,
        right: -14,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    tabBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#ffffff',
    },
    indicatorActive: {
        backgroundColor: colors.brand,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
    },
    labelActive: {
        color: colors.brand,
        fontWeight: '700',
    },
});
