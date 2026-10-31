import { Text, Platform } from 'react-native';
import { useState } from 'react';
import { WebView } from 'react-native-webview';
import type { PreviewSource } from './ProtectedDocumentPreview';
import { styles } from './ProfileDetails';
export function ProtectedDocumentPreview({
  source,
}: {
  source: PreviewSource;
}) {
  const [error, setError] = useState(false);
  if (Platform.OS === 'android' && source.mime === 'application/pdf')
    return (
      <Text style={styles.text}>
        PDF preview is available on iOS. On Android, use the authenticated web
        Documents screen.
      </Text>
    );
  if (error)
    return (
      <Text accessibilityRole="alert" style={styles.error}>
        Document preview failed or your session expired. Close and retry.
      </Text>
    );
  return (
    <WebView
      source={{
        uri: source.uri,
        headers: { Authorization: `Bearer ${source.token}` },
      }}
      startInLoadingState
      renderLoading={() => (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          Loading protected document…
        </Text>
      )}
      incognito
      cacheEnabled={false}
      cacheMode="LOAD_NO_CACHE"
      sharedCookiesEnabled={false}
      thirdPartyCookiesEnabled={false}
      javaScriptEnabled={false}
      domStorageEnabled={false}
      allowFileAccess={false}
      allowsLinkPreview={false}
      setSupportMultipleWindows={false}
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={({ url }) =>
        url === source.uri ||
        url.startsWith(source.uri + '#') ||
        url === 'about:blank'
      }
      onHttpError={() => setError(true)}
      onError={() => setError(true)}
      style={{ flex: 1, minHeight: 400 }}
    />
  );
}
