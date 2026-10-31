import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Router, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { documentFormat, MAX_DOCUMENT_BYTES } from './documents.files.js';
import { HttpError } from '../../common/http-error.js';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import {
  listDocumentsQuerySchema,
  reviewDocumentSchema,
  uploadDocumentSchema,
} from './documents.schema.js';
import type { DocumentsService } from './documents.service.js';

const access = (res: Response) => res.locals.access as Access;

export function createDocumentsRouter(
  auth: AuthService,
  documents: DocumentsService,
  uploadDir = path.resolve(process.cwd(), 'uploads', 'documents'),
) {
  fs.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) =>
        cb(
          null,
          `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
        ),
    }),
    limits: {
      fileSize: MAX_DOCUMENT_BYTES,
      files: 1,
      fields: 4,
      fieldSize: 1024,
    },
  });
  const canUpload = requirePermission(auth, 'document.upload');
  const canRead = requirePermission(auth, 'document.read');
  const canVerify = requirePermission(auth, 'document.verify');

  return (
    Router()
      // 1. Upload a document
      .post(
        '/',
        ...canUpload,
        (req, res, next) => {
          upload.single('file')(req, res, (err) => {
            if (err instanceof multer.MulterError) {
              if (err.code === 'LIMIT_FILE_SIZE') {
                return next(
                  new HttpError(
                    400,
                    'FILE_TOO_LARGE',
                    'File size exceeds maximum allowed size of 10MB.',
                  ),
                );
              }
              return next(new HttpError(400, 'UPLOAD_ERROR', err.message));
            }
            if (err) {
              return next(
                new HttpError(
                  400,
                  'UPLOAD_ERROR',
                  err instanceof Error ? err.message : 'File upload failed.',
                ),
              );
            }
            next();
          });
        },
        async (req, res, next) => {
          try {
            const metadata = parse(uploadDocumentSchema, req.body);
            const doc = await documents.uploadDocument(
              access(res),
              metadata,
              req.file as Express.Multer.File,
            );
            res.status(201).json({ data: doc });
          } catch (err) {
            if (
              req.file?.path &&
              !(err instanceof HttpError && err.code === 'UPLOAD_UNCONFIRMED')
            )
              await fs.promises.unlink(req.file.path).catch(() => undefined);
            next(err);
          }
        },
      )

      // 2. List documents (paged, filtered)
      .get('/', ...canRead, async (req, res, next) => {
        try {
          const query = parse(listDocumentsQuerySchema, req.query);
          const result = await documents.listDocuments(access(res), query);
          res.json(result);
        } catch (err) {
          next(err);
        }
      })

      // 3. Pending count badge
      .get('/pending-count', ...canRead, async (_req, res, next) => {
        try {
          const result = await documents.getPendingCount(access(res));
          res.json({ data: result });
        } catch (err) {
          next(err);
        }
      })

      .get('/:id/content', ...canRead, async (req, res) => {
        const id = parse(z.uuid(), req.params.id);
        const doc = await documents.getDocumentById(access(res), id);
        const name = path.basename(doc.fileUrl);
        if (doc.fileUrl !== `/uploads/documents/${name}`)
          throw new HttpError(404, 'NOT_FOUND', 'Document file not found.');
        const filePath = path.join(uploadDir, name);
        if (!fs.existsSync(filePath))
          throw new HttpError(404, 'NOT_FOUND', 'Document file not found.');
        const stat = await fs.promises.lstat(filePath);
        if (!stat.isFile() || stat.size > MAX_DOCUMENT_BYTES)
          throw new HttpError(
            400,
            'INVALID_FILE_TYPE',
            'Document is unavailable for preview.',
          );
        const format = documentFormat(filePath);
        res.set({
          'Cache-Control': 'private, no-store, max-age=0',
          Pragma: 'no-cache',
          'Content-Type': format.mime,
          'Content-Disposition': `inline; filename="document.${format.ext}"`,
          'X-Content-Type-Options': 'nosniff',
        });
        res.sendFile(
          filePath,
          { cacheControl: false, lastModified: false, acceptRanges: false },
          (error) => {
            if (error) {
              if (!res.headersSent) res.status(404).end();
              else res.destroy();
            }
          },
        );
      })
      // 4. Get single document details
      .get('/:id', ...canRead, async (req, res, next) => {
        try {
          const id = parse(z.uuid(), req.params.id);
          const doc = await documents.getDocumentById(access(res), id);
          res.json({ data: doc });
        } catch (err) {
          next(err);
        }
      })

      // 5. Verify / Reject document (HR Admin / Super Admin)
      .put('/:id/verify', ...canVerify, async (req, res, next) => {
        try {
          const id = parse(z.uuid(), req.params.id);
          const input = parse(reviewDocumentSchema, req.body);
          const doc = await documents.reviewDocument(access(res), id, input);
          res.json({ data: doc });
        } catch (err) {
          next(err);
        }
      })

      // 6. Delete document
      .delete('/:id', ...canUpload, async (req, res, next) => {
        try {
          const id = parse(z.uuid(), req.params.id);
          const result = await documents.deleteDocument(access(res), id);
          res.json({ data: result });
        } catch (err) {
          next(err);
        }
      })
  );
}
