import fs from 'node:fs';
import { HttpError } from '../../common/http-error.js';
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export function documentFormat(filePath: string) {
  const header = Buffer.alloc(16),
    fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, header, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (header.subarray(0, 5).toString() === '%PDF-')
    return { mime: 'application/pdf', ext: 'pdf' };
  if (header[0] === 255 && header[1] === 216 && header[2] === 255)
    return { mime: 'image/jpeg', ext: 'jpg' };
  if (
    header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { mime: 'image/png', ext: 'png' };
  if (
    header.subarray(0, 4).toString() === 'RIFF' &&
    header.subarray(8, 12).toString() === 'WEBP'
  )
    return { mime: 'image/webp', ext: 'webp' };
  throw new HttpError(
    400,
    'INVALID_FILE_TYPE',
    'Choose a real PDF, JPEG, PNG or WEBP file.',
  );
}
