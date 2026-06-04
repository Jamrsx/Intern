import { StyleSheet, View } from 'react-native';
import type { NormalizedFaceBox } from '../types/face';

const BOX_COLOR = '#3B82F6';

type Props = {
    box: NormalizedFaceBox;
    layoutWidth: number;
    layoutHeight: number;
    mirrorX?: boolean;
};

export function FaceTrackingBox({
    box,
    layoutWidth,
    layoutHeight,
    mirrorX = true,
}: Props) {
    const width = box.width * layoutWidth;
    const height = box.height * layoutHeight;
    const left = mirrorX
        ? (1 - box.x - box.width) * layoutWidth
        : box.x * layoutWidth;
    const top = box.y * layoutHeight;

    return (
        <View
            pointerEvents="none"
            style={[
                styles.box,
                {
                    left,
                    top,
                    width,
                    height,
                },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    box: {
        position: 'absolute',
        borderWidth: 3,
        borderColor: BOX_COLOR,
        borderRadius: 4,
        backgroundColor: 'transparent',
    },
});
