import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { buildFaceScanHtml } from '../face/faceScanHtml';
import type { FaceWebViewMessage } from '../types/face';

export type FaceProcessorHandle = {
    trackSnapshot: (dataUrl: string) => void;
    processSnapshot: (dataUrl: string) => void;
};

type Props = {
    onMessage: (message: FaceWebViewMessage) => void;
};

export const FaceProcessorWebView = forwardRef<FaceProcessorHandle, Props>(
    function FaceProcessorWebView({ onMessage }, ref) {
        const webViewRef = useRef<WebView>(null);

        const trackSnapshot = useCallback((dataUrl: string) => {
            const escaped = JSON.stringify(dataUrl);
            webViewRef.current?.injectJavaScript(
                `window.__trackSnapshot && window.__trackSnapshot(${escaped}); true;`,
            );
        }, []);

        const processSnapshot = useCallback((dataUrl: string) => {
            const escaped = JSON.stringify(dataUrl);
            webViewRef.current?.injectJavaScript(
                `window.__processSnapshot && window.__processSnapshot(${escaped}); true;`,
            );
        }, []);

        useImperativeHandle(
            ref,
            () => ({ trackSnapshot, processSnapshot }),
            [processSnapshot, trackSnapshot],
        );

        const handleMessage = useCallback(
            (event: WebViewMessageEvent) => {
                try {
                    const payload = JSON.parse(
                        event.nativeEvent.data,
                    ) as FaceWebViewMessage;
                    onMessage(payload);
                } catch (error) {
                    console.log('Face WebView parse error', error);
                }
            },
            [onMessage],
        );

        return (
            <WebView
                ref={webViewRef}
                source={{ html: buildFaceScanHtml() }}
                onMessage={handleMessage}
                originWhitelist={['*']}
                javaScriptEnabled
                domStorageEnabled
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                style={styles.hidden}
            />
        );
    },
);

const styles = StyleSheet.create({
    hidden: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        left: -9999,
        top: -9999,
    },
});
