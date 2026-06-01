import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function DocumentsScreen() {
    return (
        <View style={styles.screen}>
            <Text style={styles.heading}>Documents</Text>
            <Text style={styles.description}>
                Upload weekly reports, MOA, medical forms, and other required
                documents here in a future update.
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
