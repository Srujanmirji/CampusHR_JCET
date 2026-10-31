import fs from 'node:fs';
import path from 'node:path';
import { documentFormat } from './documents.files.js';
import { HttpError } from '../../common/http-error.js';
import type { Access } from '../auth/auth.service.js';
import type { Notifier } from '../notifications/notifications.service.js';
import type {
  DocumentsRepository,
  DocumentWithRelations,
} from './documents.repository.js';
import type {
  ListDocumentsQuery,
  ReviewDocumentInput,
  UploadDocumentInput,
} from './documents.schema.js';

export interface DocumentsService {
  uploadDocument(
    access: Access,
    metadata: UploadDocumentInput,
    file: Express.Multer.File,
  ): Promise<DocumentWithRelations>;

  listDocuments(
    access: Access,
    query: ListDocumentsQuery,
  ): Promise<{
    data: DocumentWithRelations[];
    total: number;
    page: number;
    totalPages: number;
  }>;

  getDocumentById(access: Access, id: string): Promise<DocumentWithRelations>;

  reviewDocument(
    access: Access,
    id: string,
    input: ReviewDocumentInput,
  ): Promise<DocumentWithRelations>;

  deleteDocument(access: Access, id: string): Promise<{ success: boolean }>;

  getPendingCount(access: Access): Promise<{ count: number }>;
}

export function createDocumentsService(
  repo: DocumentsRepository,
  notifier?: Notifier,
): DocumentsService {
  return {
    async uploadDocument(access, metadata, file) {
      if (!file) {
        throw new HttpError(400, 'BAD_REQUEST', 'No file uploaded');
      }

      const ext = file.originalname
        ? path.extname(file.originalname).toLowerCase()
        : '';
      const validExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
      const allowedMimes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/pjpeg',
        'image/png',
        'image/x-png',
        'image/webp',
      ];

      const isAllowedMime = allowedMimes.includes(file.mimetype);
      const isOctetWithValidExt =
        file.mimetype === 'application/octet-stream' && validExts.includes(ext);

      if (!isAllowedMime && !isOctetWithValidExt) {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        throw new HttpError(
          400,
          'INVALID_FILE_TYPE',
          `Invalid file format: ${file.mimetype || ext}. Allowed formats: PDF, JPEG, PNG, WEBP.`,
        );
      }

      // Max 10MB
      const maxBytes = 10 * 1024 * 1024;
      if (file.size > maxBytes) {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        throw new HttpError(
          400,
          'FILE_TOO_LARGE',
          'File size exceeds maximum allowed size of 10MB.',
        );
      }

      const employeeId = access.employeeId;
      if (!employeeId) {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Your account is not linked to an employee profile.',
        );
      }

      let detected: ReturnType<typeof documentFormat>;
      try {
        detected = documentFormat(file.path);
        if (
          !file.size ||
          (detected.ext !== ext.slice(1) &&
            !(detected.ext === 'jpg' && ext === '.jpeg'))
        )
          throw new HttpError(
            400,
            'INVALID_FILE_TYPE',
            'The file contents do not match its extension.',
          );
      } catch (error) {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        if (error instanceof HttpError) throw error;
        throw new HttpError(
          400,
          'INVALID_FILE_TYPE',
          'The uploaded file could not be read.',
        );
      }
      const fileUrl = `/uploads/documents/${path.basename(file.path)}`;

      const doc = await repo
        .create({
          employeeId,
          category: metadata.category,
          title: metadata.title,
          documentType: metadata.documentType,
          fileUrl,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: detected.mime,
          expiryDate: metadata.expiryDate
            ? new Date(metadata.expiryDate)
            : null,
        })
        .catch(() => {
          // shortcut: retain the private file after uncertain DB writes; reconcile orphans as storage grows.
          throw new HttpError(
            503,
            'UPLOAD_UNCONFIRMED',
            'Document upload could not be confirmed. Refresh your documents before trying again.',
          );
        });

      // Notify HR Admin of new document submission (non-blocking)
      if (notifier) {
        try {
          await notifier.notifyRole('HR Admin', null, {
            kind: 'document.uploaded',
            title: 'New Document Awaiting Verification',
            body: `New ${metadata.documentType} ("${metadata.title}") uploaded for verification.`,
            link: '/documents',
          });
        } catch (notifErr) {
          console.error('Failed to notify HR Admin:', notifErr);
        }
      }

      return doc;
    },

    async listDocuments(access, query) {
      const hasAllScope = access.scope === 'all';
      if (!hasAllScope && !access.employeeId)
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Your account is not linked to an employee profile.',
        );

      let targetEmployeeId = query.employeeId;
      if (!hasAllScope) {
        targetEmployeeId = access.employeeId ?? undefined;
      }

      return repo.findMany({
        employeeId: targetEmployeeId,
        category: query.category,
        status: query.status,
        search: query.search,
        page: query.page,
        limit: query.limit,
      });
    },

    async getDocumentById(access, id) {
      const doc = await repo.findById(id);
      if (!doc) {
        throw new HttpError(404, 'NOT_FOUND', 'Document not found.');
      }

      const hasAllScope = access.scope === 'all';
      if (!hasAllScope && doc.employeeId !== access.employeeId) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'You do not have permission to view this document.',
        );
      }

      return doc;
    },

    async reviewDocument(access, id, input) {
      const hasVerifyPermission = access.scope === 'all';
      if (!hasVerifyPermission) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Only HR Administrators can verify or reject documents.',
        );
      }

      const existing = await repo.findById(id);
      if (!existing) {
        throw new HttpError(404, 'NOT_FOUND', 'Document not found.');
      }

      const updated = await repo.updateStatus(id, {
        status: input.status,
        reviewedByUserId: access.userId,
        reviewNote: input.reviewNote,
        reviewedAt: new Date(),
      });

      // Send in-app notification to the employee
      if (notifier && updated.employee?.id) {
        const isVerified = input.status === 'VERIFIED';
        await notifier.notifyEmployee(updated.employee.id, {
          kind: isVerified ? 'document.verified' : 'document.rejected',
          title: isVerified ? 'Document Verified' : 'Document Rejected',
          body: isVerified
            ? `Your document "${updated.title}" (${updated.documentType}) has been verified.`
            : `Your document "${updated.title}" was rejected. Note: ${input.reviewNote || 'Please re-upload a clear copy.'}`,
          link: '/documents',
        });
      }

      return updated;
    },

    async deleteDocument(access, id) {
      const doc = await repo.findById(id);
      if (!doc) {
        throw new HttpError(404, 'NOT_FOUND', 'Document not found.');
      }

      const isOwner = doc.employeeId === access.employeeId;
      const isAdmin = access.scope === 'all';

      if (!isOwner && !isAdmin) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'You do not have permission to delete this document.',
        );
      }

      // If document was already verified, faculty cannot delete it without admin
      if (doc.status === 'VERIFIED' && !isAdmin) {
        throw new HttpError(
          400,
          'BAD_REQUEST',
          'Verified documents cannot be deleted. Please contact HR.',
        );
      }

      await repo.delete(id);

      // Clean up physical file if exists
      try {
        const uploadDir = path.resolve(process.cwd(), 'uploads', 'documents');
        const filename = path.basename(doc.fileUrl);
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // ignore file delete error
      }

      return { success: true };
    },

    async getPendingCount(access) {
      if (access.scope !== 'all' && !access.employeeId)
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Your account is not linked to an employee profile.',
        );
      const hasAllScope = access.scope === 'all';
      const count = await repo.countPending(
        hasAllScope ? undefined : (access.employeeId ?? undefined),
      );
      return { count };
    },
  };
}
