declare module 'react-native-webview' {
  import { type ViewProps } from 'react-native';

  export interface WebViewProps extends ViewProps {
    source?: { uri: string; headers?: Record<string, string> } | { html: string };
    javaScriptEnabled?: boolean;
    domStorageEnabled?: boolean;
    mediaPlaybackRequiresUserAction?: boolean;
    allowsInlineMediaPlayback?: boolean;
    startInLoadingState?: boolean;
    scalesPageToFit?: boolean;
    injectedJavaScript?: string;
    androidLayerType?: 'none' | 'software' | 'hardware';
    onMessage?: (event: { nativeEvent: { data: string } }) => void;
    onLoad?: () => void;
    onLoadEnd?: () => void;
    onError?: (event?: { nativeEvent: { description: string } }) => void;
    onNavigationStateChange?: (state: { url: string; title: string; loading: boolean }) => void;
    style?: ViewProps['style'];
    ref?: React.Ref<any>;
  }

  const WebView: React.ForwardRefExoticComponent<WebViewProps & React.RefAttributes<any>>;
  export default WebView;
}
