import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
    size?: number;
    color?: string;
};

export function BellIcon({
    size = 22,
    color = colors.brand,
}: Props) {
    const stroke = Math.max(2, size * 0.1);
    const domeWidth = size * 0.52;
    const domeHeight = size * 0.38;
    const flareWidth = size * 0.72;
    const flareHeight = size * 0.28;
    const clapperSize = size * 0.14;

    return (
        <View style={[styles.wrap, { width: size, height: size }]}>
            <View
                style={[
                    styles.dome,
                    {
                        width: domeWidth,
                        height: domeHeight,
                        borderWidth: stroke,
                        borderColor: color,
                        borderTopLeftRadius: domeWidth / 2,
                        borderTopRightRadius: domeWidth / 2,
                    },
                ]}
            />
            <View
                style={[
                    styles.flare,
                    {
                        width: flareWidth,
                        height: flareHeight,
                        borderWidth: stroke,
                        borderColor: color,
                        borderBottomLeftRadius: flareWidth * 0.2,
                        borderBottomRightRadius: flareWidth * 0.2,
                        marginTop: -stroke,
                    },
                ]}
            />
            <View
                style={[
                    styles.clapper,
                    {
                        width: clapperSize,
                        height: clapperSize,
                        borderRadius: clapperSize / 2,
                        backgroundColor: color,
                        marginTop: size * 0.04,
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    dome: {
        borderBottomWidth: 0,
        backgroundColor: 'transparent',
    },
    flare: {
        borderTopWidth: 0,
        backgroundColor: 'transparent',
    },
    clapper: {},
});
