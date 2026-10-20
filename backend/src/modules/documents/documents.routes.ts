import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Router, type Response } from 'express';
import multer from 'multer';
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

// Storage configuration
const uploadDir = path.resolve(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${randomUUID()}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export function createDocumentsRouter(
  auth: AuthService,
  documents: DocumentsService,
) {
  const canUpload = requirePermission(auth, 'document.upload');
  const canRead = requirePermission(auth, 'document.read');
  const canVerify = requirePermission(auth, 'document.verify');

  return Router()
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

    // 4. Get single document details
    .get('/:id', ...canRead, async (req, res, next) => {
      try {
        const id = req.params.id as string;
        const doc = await documents.getDocumentById(access(res), id);
        res.json({ data: doc });
      } catch (err) {
        next(err);
      }
    })

    // 5. Verify / Reject document (HR Admin / Super Admin)
    .put('/:id/verify', ...canVerify, async (req, res, next) => {
      try {
        const id = req.params.id as string;
        const input = parse(reviewDocumentSchema, req.body);
        const doc = await documents.reviewDocument(
          access(res),
          id,
          input,
        );
        res.json({ data: doc });
      } catch (err) {
        next(err);
      }
    })

    // 6. Delete document
    .delete('/:id', ...canUpload, async (req, res, next) => {
      try {
        const id = req.params.id as string;
        const result = await documents.deleteDocument(access(res), id);
        res.json({ data: result });
      } catch (err) {
        next(err);
      }
    });
}
