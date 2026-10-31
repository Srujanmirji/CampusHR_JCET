import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth-context';
import { homeUnavailable, canReadHome } from '../../lib/home-api';
import {
  categorySchema,
  documentPreview,
  listOwnDocuments,
  uploadOwnDocument,
  uploadSchema,
  type OwnDocument,
  type SelectedDocument,
} from '../../lib/documents-api';
import { discardDocument, pickDocument } from '../../lib/document-picker';
import { ApiError } from '../../lib/session';
import { theme } from '../../lib/theme';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import {
  ProtectedDocumentPreview,
  type PreviewSource,
} from './ProtectedDocumentPreview';
import { styles } from './ProfileDetails';
export function DocumentsPanel() {
  const { user, accessToken } = useAuth();
  const unavailable = homeUnavailable(user, accessToken, 'document.read');
  const query = useInfiniteQuery({
    queryKey: ['documents', user?.id, 'own'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listOwnDocuments(user, accessToken, pageParam),
    getNextPageParam: (page) =>
      page.page < page.totalPages ? page.page + 1 : undefined,
    enabled: !unavailable,
    retry: false,
  });
  const { refetch } = query;
  const [file, setFile] = useState<SelectedDocument | null>(null),
    fileRef = useRef<SelectedDocument | null>(null);
  const [title, setTitle] = useState(''),
    [documentType, setType] = useState(''),
    [expiryDate, setExpiry] = useState(''),
    [category, setCategory] = useState<
      'IDENTITY' | 'ACADEMIC' | 'EMPLOYMENT' | 'CERTIFICATION' | 'OTHER'
    >('ACADEMIC');
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [uncertain, setUncertain] = useState(false),
    [preview, setPreview] = useState<PreviewSource | null>(null);
  const generation = useRef(0),
    working = useRef(false),
    controller = useRef<AbortController | null>(null),
    active = useRef(true);
  const clearFile = useCallback(() => {
    const old = fileRef.current;
    fileRef.current = null;
    setFile(null);
    void discardDocument(old).catch(() =>
      setNotice(
        'Temporary file cleanup failed. Unlock the device and sign out to retry cleanup.',
      ),
    );
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (!unavailable) void refetch();
      return () => {
        generation.current++;
        if (controller.current) {
          controller.current.abort();
          setUncertain(true);
          setNotice(
            'Upload interrupted. Refresh documents and check for the file before starting a new upload.',
          );
        }
        clearFile();
        setPreview(null);
      };
    }, [clearFile, unavailable, refetch]),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      active.current = state === 'active';
      if (!active.current) setPreview(null);
      if (state === 'background') {
        generation.current++;
        if (controller.current) {
          controller.current.abort();
          setUncertain(true);
          setNotice(
            'Upload interrupted. Refresh documents and check for the file before starting a new upload.',
          );
        }
        clearFile();
      }
    });
    return () => subscription.remove();
  }, [clearFile]);
  async function choose() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setNotice('');
    const own = generation.current;
    try {
      const picked = await pickDocument();
      if (!picked) return;
      if (own !== generation.current) {
        await discardDocument(picked);
        return;
      }
      await discardDocument(fileRef.current);
      fileRef.current = picked;
      setFile(picked);
    } catch (error) {
      if (own === generation.current)
        setNotice(
          error instanceof Error ? error.message : 'File selection failed.',
        );
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function upload() {
    if (working.current || uncertain || !fileRef.current) return;
    const parsed = uploadSchema.safeParse({
      title,
      documentType,
      expiryDate,
      category,
    });
    if (!parsed.success) {
      setNotice(
        'Enter a title, document type and a valid optional expiry date (YYYY-MM-DD).',
      );
      return;
    }
    working.current = true;
    setBusy(true);
    setNotice('');
    const own = generation.current;
    const abort = new AbortController(),
      timeout = setTimeout(() => abort.abort(), 30000);
    controller.current = abort;
    try {
      await uploadOwnDocument(
        user,
        accessToken,
        parsed.data,
        fileRef.current,
        Platform.OS !== 'web',
        abort.signal,
      );
      if (own !== generation.current) return;
      clearFile();
      setTitle('');
      setType('');
      setExpiry('');
      setNotice('Document uploaded. Waiting for HR review.');
      await query.refetch();
    } catch (error) {
      if (own !== generation.current) return;
      const unknown =
        !(error instanceof ApiError) ||
        error.status === 0 ||
        error.status >= 500;
      setUncertain(unknown);
      setNotice(
        unknown
          ? 'Upload was not confirmed. Refresh documents and check for the file before starting a new upload.'
          : error.message,
      );
    } finally {
      clearTimeout(timeout);
      controller.current = null;
      working.current = false;
      setBusy(false);
    }
  }
  async function showDocumentPreview(row: OwnDocument) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setNotice('');
    const own = generation.current;
    try {
      const source = await documentPreview(user, accessToken, row);
      if (own === generation.current && active.current) setPreview(source);
    } catch {
      if (own === generation.current)
        setNotice(
          'Document preview unavailable. Check your connection or permissions and retry.',
        );
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  const rows = (query.data?.pages.flatMap((page) => page.data) ?? []).filter(
    (row, index, all) => all.findIndex((item) => item.id === row.id) === index,
  );
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.heading}>
        My documents
      </Text>
      {unavailable ? (
        <Text style={styles.text}>
          {unavailable} Documents require your own employee link.
        </Text>
      ) : (
        <>
          <Button
            variant="outline"
            onPress={() => void query.refetch()}
            disabled={busy}
          >
            Refresh documents
          </Button>
          {query.isPending ? (
            <Skeleton label="Loading your documents" />
          ) : query.isError ? (
            <Text style={styles.error}>
              Documents could not be loaded. Refresh to retry.
            </Text>
          ) : rows.length === 0 ? (
            <Text style={styles.text}>No documents uploaded yet.</Text>
          ) : (
            rows.map((row) => (
              <View
                key={row.id}
                style={{
                  gap: theme.spacing.sm,
                  paddingVertical: theme.spacing.section,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                }}
              >
                <Text style={[styles.body, { fontWeight: '600' }]}>
                  {row.title}
                </Text>
                <Text style={styles.text}>
                  {row.documentType} · {row.status} ·{' '}
                  {(row.fileSize / 1024).toFixed(1)} KB
                </Text>
                {!!row.reviewNote && (
                  <Text style={styles.text}>HR note: {row.reviewNote}</Text>
                )}
                {!!row.expiryDate && (
                  <Text style={styles.text}>
                    Expires: {row.expiryDate.slice(0, 10)}
                  </Text>
                )}
                <Button
                  variant="outline"
                  onPress={() => void showDocumentPreview(row)}
                  disabled={busy}
                >
                  Preview {row.title}
                </Button>
              </View>
            ))
          )}
          {query.hasNextPage && (
            <Button
              onPress={() => void query.fetchNextPage()}
              loading={query.isFetchingNextPage}
            >
              Load more documents
            </Button>
          )}
          {canReadHome(user, 'document.upload') && (
            <>
              <Text accessibilityRole="header" style={styles.heading}>
                Upload a document
              </Text>
              <Text style={styles.text}>
                PDF, JPEG, PNG or WEBP, up to 10 MB. Files are private and sent
                for HR review.
              </Text>
              <Input
                label="Document title"
                value={title}
                onChangeText={setTitle}
                disabled={busy || uncertain}
              />
              <Input
                label="Document type"
                value={documentType}
                onChangeText={setType}
                disabled={busy || uncertain}
                placeholder="Degree certificate"
              />
              <Text style={styles.text}>Category: {category}</Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: theme.spacing.sm,
                }}
              >
                {categorySchema.options.map((value) => (
                  <Button
                    key={value}
                    variant={value === category ? 'secondary' : 'text'}
                    accessibilityLabel={`${value.charAt(0) + value.slice(1).toLowerCase()}${value === category ? ', selected' : ''}`}
                    disabled={busy || uncertain}
                    onPress={() => setCategory(value)}
                  >
                    {value.charAt(0) + value.slice(1).toLowerCase()}
                  </Button>
                ))}
              </View>
              <Input
                label="Expiry date (optional)"
                value={expiryDate}
                onChangeText={setExpiry}
                placeholder="YYYY-MM-DD"
                disabled={busy || uncertain}
              />
              <Button
                variant="outline"
                onPress={() => void choose()}
                disabled={busy || uncertain}
              >
                Choose document file
              </Button>
              {file && (
                <>
                  <Text style={styles.text}>
                    {file.name} · {(file.size / 1024).toFixed(1)} KB
                  </Text>
                  <Button variant="outline" onPress={clearFile} disabled={busy}>
                    Remove selected file
                  </Button>
                </>
              )}
              <Button
                onPress={() => void upload()}
                loading={busy}
                disabled={!file || uncertain}
              >
                Upload document
              </Button>
              {uncertain && (
                <Button
                  variant="outline"
                  onPress={() => {
                    clearFile();
                    setTitle('');
                    setType('');
                    setExpiry('');
                    setUncertain(false);
                    setNotice(
                      'Check the refreshed list before selecting a new file.',
                    );
                  }}
                >
                  Discard upload draft
                </Button>
              )}
            </>
          )}
        </>
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {notice}
        </Text>
      )}
      <Modal
        visible={!!preview}
        animationType="none"
        onRequestClose={() => setPreview(null)}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.section,
          }}
        >
          <Button variant="outline" onPress={() => setPreview(null)}>
            Close document preview
          </Button>
          {preview && <ProtectedDocumentPreview source={preview} />}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
