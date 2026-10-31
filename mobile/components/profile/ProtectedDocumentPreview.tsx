import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { MAX_DOCUMENT_BYTES, mimeTypes } from '../../lib/documents-api';
import { apiFetch } from '../../lib/session';
import { styles } from './ProfileDetails';
export interface PreviewSource {
  uri: string;
  token: string;
  mime: string;
}
export function ProtectedDocumentPreview({
  source,
}: {
  source: PreviewSource;
}) {
  const [url, setUrl] = useState<string | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true,
      objectUrl: string | undefined;
    const controller = new AbortController();
    const path = new URL(source.uri).pathname.replace(/^.*\/api\/v1/, '');
    void apiFetch(path, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.blob())
      .then((blob) => {
        if (
          !mimeTypes.includes(blob.type) ||
          !blob.size ||
          blob.size > MAX_DOCUMENT_BYTES
        )
          throw new Error('Invalid document content.');
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source]);
  if (error)
    return (
      <Text accessibilityRole="alert" style={styles.error}>
        Document preview failed. Close and retry.
      </Text>
    );
  if (!url)
    return (
      <Text accessibilityLiveRegion="polite" style={styles.text}>
        Loading protected document…
      </Text>
    );
  return source.mime === 'application/pdf' ? (
    <iframe
      title="Protected document"
      src={url}
      style={{ width: '100%', height: 500, border: 0 }}
    />
  ) : (
    <img
      alt="Protected document"
      src={url}
      style={{ width: '100%', maxHeight: 500, objectFit: 'contain' }}
    />
  );
}
