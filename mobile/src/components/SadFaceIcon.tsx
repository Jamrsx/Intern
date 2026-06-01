import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
    size?: number;
    color?: string;
};

export function SadFaceIcon({
    size = 28,
    color = colors.brand,
}: Props) {
    const stroke = Math.max(2, size * 0.07);
    const eye = size * 0.09;
    const eyeGap = size * 0.22;
    const mouthWidth = size * 0.48;
    const mouthHeight = size * 0.22;

    return (
        <View
            style={[
                styles.face,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: stroke,
                    borderColor: color,
                },
            ]}
        >
            <View style={[styles.eyes, { gap: eyeGap }]}>
                <View
                    style={{
                        width: eye,
                        height: eye,
                        borderRadius: eye / 2,
                        backgroundColor: color,
                    }}
                />
                <View
                    style={{
                        width: eye,
                        height: eye,
                        borderRadius: eye / 2,
                        backgroundColor: color,
                    }}
                />
            </View>
            <View
                style={{
                    width: mouthWidth,
                    height: mouthHeight,
                    borderWidth: stroke,
                    borderColor: color,
                    borderTopWidth: stroke,
                    borderBottomWidth: 0,
                    borderTopLeftRadius: mouthWidth / 2,
                    borderTopRightRadius: mouthWidth / 2,
                    marginTop: size * 0.06,
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    face: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    eyes: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -2,
    },
});
