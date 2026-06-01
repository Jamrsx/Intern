import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function TimeScreen() {
    return (
        <View style={styles.screen}>
            <Text style={styles.heading}>Time in / out</Text>
            <Text style={styles.description}>
                Facial recognition time logging will be available here in a
                future update.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 8,
        justifyContent: 'center',
    },
    heading: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
    },
    description: {
        marginTop: 12,
        fontSize: 15,
        lineHeight: 22,
        color: colors.textMuted,
        textAlign: 'center',
    },
});
