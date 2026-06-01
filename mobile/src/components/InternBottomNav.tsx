import { Pressable, StyleSheet, Text, View } from 'react-native';
import { INTERN_TABS, type InternTab } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = {
    activeTab: InternTab;
    onTabPress: (tab: InternTab) => void;
};

export function InternBottomNav({ activeTab, onTabPress }: Props) {
    return (
        <View style={styles.container}>
            {INTERN_TABS.map((tab) => {
                const isActive = activeTab === tab.id;

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
                        <View
                            style={[
                                styles.indicator,
                                isActive && styles.indicatorActive,
                            ]}
                        />
                        <Text
                            style={[
                                styles.label,
                                isActive && styles.labelActive,
                            ]}
                        >
                            {tab.label}
                        </Text>
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
    indicator: {
        width: 28,
        height: 3,
        borderRadius: 999,
        backgroundColor: 'transparent',
        marginBottom: 6,
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
