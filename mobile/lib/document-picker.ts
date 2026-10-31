import { Platform } from 'react-native';
import { getDocumentAsync } from 'expo-document-picker';
import { Directory, File as NativeFile, Paths } from 'expo-file-system';
import {
  mimeTypes,
  validateSelection,
  type SelectedDocument,
} from './documents-api';
export async function discardDocument(file: SelectedDocument | null) {
  if (!file) return;
  if (Platform.OS === 'web') {
    if (file.uri.startsWith('blob:')) URL.revokeObjectURL(file.uri);
    return;
  }
  const native = new NativeFile(file.uri);
  // Delete only the picker copy in this app's cache, never a provider's original.
  if (native.uri.startsWith(Paths.cache.uri + 'DocumentPicker/')) {
    if (native.exists) native.delete();
  }
}
export async function pickDocument(): Promise<SelectedDocument | null> {
  const result = await getDocumentAsync({
    type: mimeTypes,
    multiple: false,
    copyToCacheDirectory: true,
    base64: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error('No file was selected.');
  const ext = asset.name.split('.').at(-1)?.toLowerCase();
  const fallback = (
    {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    } as Record<string, string>
  )[ext ?? ''];
  const file: SelectedDocument = {
    uri: asset.uri,
    name: asset.name,
    size:
      asset.size ??
      (Platform.OS === 'web'
        ? (asset.file?.size ?? 0)
        : new NativeFile(asset.uri).size),
    mimeType:
      asset.mimeType === 'application/octet-stream' || !asset.mimeType
        ? fallback
        : asset.mimeType,
    file: asset.file,
  };
  try {
    if (
      Platform.OS !== 'web' &&
      !new NativeFile(file.uri).uri.startsWith(
        Paths.cache.uri + 'DocumentPicker/',
      )
    )
      throw new Error('The picker could not create a private temporary copy.');
    return validateSelection(file);
  } catch (error) {
    await discardDocument(file);
    throw error;
  }
}

export async function clearDocumentCache() {
  if (Platform.OS === 'web') return;
  const directory = new Directory(Paths.cache, 'DocumentPicker');
  if (directory.exists) directory.delete();
}
