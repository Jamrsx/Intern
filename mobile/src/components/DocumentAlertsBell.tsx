import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BellIcon } from './BellIcon';
import { colors } from '../theme/colors';

type Props = {
    alertCount: number;
    onPress: () => void;
};

export function DocumentAlertsBell({ alertCount, onPress }: Props) {
    const showBadge = alertCount > 0;
    const badgeLabel = alertCount > 9 ? '9+' : String(alertCount);

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Document alerts"
            accessibilityHint="Shows required documents and deadlines from your coordinator"
        >
            <BellIcon size={20} color={colors.brand} />
            {showBadge ? (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeLabel}</Text>
                </View>
            ) : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPressed: {
        opacity: 0.88,
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
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
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#ffffff',
    },
});
