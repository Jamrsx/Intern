import { Image, StyleSheet, View } from 'react-native';
import { occLogo } from '../images/brand';
import { colors } from '../theme/colors';

type Props = {
    size?: number;
};

export function OccLogoMark({ size = 56 }: Props) {
    const imageSize = Math.round(size * 0.82);

    console.log('OccLogoMark rendered', { size, imageSize });

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Image
                source={occLogo}
                style={{ width: imageSize, height: imageSize }}
                resizeMode="contain"
                accessibilityLabel="OCC Intern logo"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: colors.brandForeground,
        borderWidth: 1,
        borderColor: colors.brandMuted,
        overflow: 'hidden',
    },
});
