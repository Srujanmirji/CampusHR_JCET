import { z } from 'zod';
import { apiFetch, getSession, type AuthUser } from './session';
import { API_BASE_URL } from './api-config';
import { ownAccess } from './profile-api';
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const categorySchema = z.enum([
  'IDENTITY',
  'ACADEMIC',
  'EMPLOYMENT',
  'CERTIFICATION',
  'OTHER',
]);
export const mimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const documentSchema = z.object({
  id: z.uuid(),
  employeeId: z.uuid(),
  title: z.string().min(2),
  documentType: z.string(),
  category: categorySchema,
  fileName: z.string(),
  fileSize: z.number().int().positive().max(MAX_DOCUMENT_BYTES),
  mimeType: z.string(),
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']),
  expiryDate: z.string().nullable().optional(),
  reviewNote: z.string().nullable().optional(),
  createdAt: z.iso.datetime(),
});
export type OwnDocument = z.infer<typeof documentSchema>;
export const uploadSchema = z.object({
  title: z.string().trim().min(2).max(150),
  documentType: z.string().trim().min(2).max(100),
  category: categorySchema,
  expiryDate: z.union([z.iso.date(), z.literal('')]),
});
export interface SelectedDocument {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  file?: File;
}
export function validateSelection(file: SelectedDocument) {
  if (
    !Number.isInteger(file.size) ||
    file.size <= 0 ||
    file.size > MAX_DOCUMENT_BYTES
  )
    throw new Error('Choose a file between 1 byte and 10 MB.');
  const ext = file.name.split('.').at(-1)?.toLowerCase();
  const expected = (
    {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    } as Record<string, string>
  )[ext ?? ''];
  if (!expected || file.mimeType !== expected)
    throw new Error(
      'Choose a PDF, JPEG, PNG or WEBP file with a matching extension.',
    );
  return file;
}
export async function listOwnDocuments(
  user: AuthUser | null,
  token: string | null,
  page = 1,
) {
  const employeeId = ownAccess(user, token, 'document.read');
  z.number().int().positive().parse(page);
  const data = z
    .object({
      data: z.array(documentSchema).max(20),
      page: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().positive(),
    })
    .parse(
      await (
        await apiFetch(
          `/documents?employeeId=${employeeId}&page=${page}&limit=20`,
        )
      ).json(),
    );
  if (
    data.page !== page ||
    data.data.some((row) => row.employeeId !== employeeId) ||
    new Set(data.data.map((row) => row.id)).size !== data.data.length
  )
    throw new Error('The server returned an invalid own-document page.');
  return data;
}
export async function uploadOwnDocument(
  user: AuthUser | null,
  token: string | null,
  metadata: z.input<typeof uploadSchema>,
  selected: SelectedDocument,
  native: boolean,
  signal: AbortSignal,
) {
  const employeeId = ownAccess(user, token, 'document.upload'),
    values = uploadSchema.parse(metadata);
  validateSelection(selected);
  const form = new FormData();
  for (const [key, value] of Object.entries(values))
    if (value) form.append(key, value);
  if (native)
    form.append('file', {
      uri: selected.uri,
      name: selected.name,
      type: selected.mimeType,
    } as unknown as Blob);
  else {
    if (!selected.file || selected.file.size !== selected.size)
      throw new Error('Select the file again.');
    form.append('file', selected.file, selected.name);
  }
  const response = await apiFetch('/documents', {
    method: 'POST',
    body: form,
    signal,
  });
  const row = z
    .object({ data: documentSchema })
    .parse(await response.json()).data;
  if (
    response.status !== 201 ||
    row.employeeId !== employeeId ||
    row.title !== values.title ||
    row.fileName !== selected.name ||
    row.fileSize !== selected.size ||
    row.category !== values.category
  )
    throw new Error(
      'Upload was not confirmed. Refresh documents before trying again.',
    );
  return row;
}
export async function documentPreview(
  user: AuthUser | null,
  token: string | null,
  row: OwnDocument,
) {
  const id = ownAccess(user, token, 'document.read');
  if (row.employeeId !== id)
    throw new Error('This document belongs to another employee.');
  z.uuid().parse(row.id);
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await apiFetch(`/documents/${row.id}/content`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    const mime = response.headers.get('content-type')?.split(';')[0],
      size = Number(response.headers.get('content-length'));
    if (
      !mime ||
      !mimeTypes.includes(mime) ||
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > MAX_DOCUMENT_BYTES
    )
      throw new Error('This document cannot be previewed safely.');
    return {
      uri: `${API_BASE_URL}/documents/${row.id}/content`,
      token: getSession().accessToken!,
      mime,
    };
  } finally {
    clearTimeout(timeout);
  }
}
