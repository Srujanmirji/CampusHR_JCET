import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'campushr-document-unit-'));
const testPdf = () => {
  const file = path.join(temp, `${Math.random()}.pdf`);
  fs.writeFileSync(file, '%PDF-1.4\n%%EOF');
  return file;
};
after(() => fs.rmSync(temp, { recursive: true, force: true }));
import { HttpError } from '../src/common/http-error.js';
import type {
  DocumentWithRelations,
  DocumentsRepository,
} from '../src/modules/documents/documents.repository.js';
import { createDocumentsService } from '../src/modules/documents/documents.service.js';

function createMemoryDocumentsRepository(): DocumentsRepository {
  const docs: DocumentWithRelations[] = [];

  return {
    async create(data) {
      const doc: DocumentWithRelations = {
        id: `doc-${docs.length + 1}`,
        employeeId: data.employeeId,
        category: data.category,
        title: data.title,
        documentType: data.documentType,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        status: 'PENDING',
        expiryDate: data.expiryDate ?? null,
        reviewedByUserId: null,
        reviewedAt: null,
        reviewNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        employee: {
          id: data.employeeId,
          firstName: 'Zeeshan',
          lastName: 'Madras',
          employeeCode: 'JCET-CSE-001',
          department: { id: 1, name: 'Computer Science', code: 'CSE' },
        },
      };
      docs.push(doc);
      return doc;
    },

    async findById(id) {
      return docs.find((d) => d.id === id) ?? null;
    },

    async findMany({ employeeId, category, status }) {
      let filtered = [...docs];
      if (employeeId) {
        filtered = filtered.filter((d) => d.employeeId === employeeId);
      }
      if (category) {
        filtered = filtered.filter((d) => d.category === category);
      }
      if (status) {
        filtered = filtered.filter((d) => d.status === status);
      }
      return {
        data: filtered,
        total: filtered.length,
        page: 1,
        totalPages: 1,
      };
    },

    async updateStatus(id, data) {
      const doc = docs.find((d) => d.id === id);
      if (!doc) throw new Error('Not found');
      doc.status = data.status;
      doc.reviewedByUserId = data.reviewedByUserId;
      doc.reviewNote = data.reviewNote ?? null;
      doc.reviewedAt = data.reviewedAt;
      return doc;
    },

    async delete(id) {
      const idx = docs.findIndex((d) => d.id === id);
      if (idx === -1) throw new Error('Not found');
      const [removed] = docs.splice(idx, 1);
      return removed;
    },

    async countPending(employeeId) {
      return docs.filter(
        (d) =>
          d.status === 'PENDING' &&
          (!employeeId || d.employeeId === employeeId),
      ).length;
    },
  };
}

test('uploadDocument creates a pending document for valid files', async () => {
  const repo = createMemoryDocumentsRepository();
  const service = createDocumentsService(repo);

  const facultyAccess = {
    scope: 'own' as const,
    userId: 'user-1',
    employeeId: 'emp-1',
    departmentId: 1,
  };

  const file = {
    fieldname: 'file',
    originalname: 'phd_degree.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024 * 500, // 500KB
    destination: '/uploads',
    filename: 'test.pdf',
    path: testPdf(),
    buffer: Buffer.from(''),
  } as Express.Multer.File;

  const result = await service.uploadDocument(
    facultyAccess,
    {
      category: 'ACADEMIC',
      documentType: 'Degree Certificate',
      title: 'Ph.D. in Computer Science',
      expiryDate: null,
    },
    file,
  );

  assert.equal(result.title, 'Ph.D. in Computer Science');
  assert.equal(result.status, 'PENDING');
  assert.equal(result.category, 'ACADEMIC');
  assert.equal(result.employeeId, 'emp-1');
});

test('uploadDocument rejects invalid file types', async () => {
  const repo = createMemoryDocumentsRepository();
  const service = createDocumentsService(repo);

  const facultyAccess = {
    scope: 'own' as const,
    userId: 'user-1',
    employeeId: 'emp-1',
    departmentId: 1,
  };

  const invalidFile = {
    mimetype: 'application/x-msdownload',
    size: 100,
    path: '',
  } as Express.Multer.File;

  await assert.rejects(
    async () => {
      await service.uploadDocument(
        facultyAccess,
        {
          category: 'OTHER',
          documentType: 'Malicious',
          title: 'test.exe',
          expiryDate: null,
        },
        invalidFile,
      );
    },
    (err: unknown) =>
      err instanceof HttpError &&
      err.status === 400 &&
      err.code === 'INVALID_FILE_TYPE',
  );
});

test('HR Admin can review and verify pending documents', async () => {
  const repo = createMemoryDocumentsRepository();
  let notificationSent = false;
  const mockNotifier = {
    notifyRole: async () => {},
    notifyEmployee: async () => {
      notificationSent = true;
    },
  };

  const service = createDocumentsService(repo, mockNotifier);

  const facultyAccess = {
    scope: 'own' as const,
    userId: 'user-1',
    employeeId: 'emp-1',
    departmentId: 1,
  };

  const hrAccess = {
    scope: 'all' as const,
    userId: 'hr-user-1',
    employeeId: 'emp-hr',
    departmentId: null,
  };

  const file = {
    originalname: 'aadhaar.pdf',
    mimetype: 'application/pdf',
    size: 2048,
    path: testPdf(),
  } as Express.Multer.File;

  const uploaded = await service.uploadDocument(
    facultyAccess,
    {
      category: 'IDENTITY',
      documentType: 'Aadhaar Card',
      title: 'National Identity Proof',
      expiryDate: null,
    },
    file,
  );

  assert.equal(uploaded.status, 'PENDING');

  const verified = await service.reviewDocument(hrAccess, uploaded.id, {
    status: 'VERIFIED',
    reviewNote: 'Verified against UIDAI standards',
  });

  assert.equal(verified.status, 'VERIFIED');
  assert.equal(verified.reviewNote, 'Verified against UIDAI standards');
  assert.equal(notificationSent, true);
});

test('Faculty can only see own documents, HR Admin sees all', async () => {
  const repo = createMemoryDocumentsRepository();
  const service = createDocumentsService(repo);

  const faculty1 = {
    scope: 'own' as const,
    userId: 'u1',
    employeeId: 'emp-1',
    departmentId: 1,
  };
  const faculty2 = {
    scope: 'own' as const,
    userId: 'u2',
    employeeId: 'emp-2',
    departmentId: 1,
  };
  const hrAdmin = {
    scope: 'all' as const,
    userId: 'hr',
    employeeId: 'emp-hr',
    departmentId: null,
  };

  const file = {
    originalname: 'doc.pdf',
    mimetype: 'application/pdf',
    size: 100,
    path: testPdf(),
  } as Express.Multer.File;

  await service.uploadDocument(
    faculty1,
    {
      category: 'ACADEMIC',
      documentType: 'Cert',
      title: 'Doc 1',
      expiryDate: null,
    },
    file,
  );
  await service.uploadDocument(
    faculty2,
    {
      category: 'IDENTITY',
      documentType: 'PAN',
      title: 'Doc 2',
      expiryDate: null,
    },
    file,
  );

  const listFaculty1 = await service.listDocuments(faculty1, {
    page: 1,
    limit: 10,
  });
  assert.equal(listFaculty1.data.length, 1);
  assert.equal(listFaculty1.data[0].employeeId, 'emp-1');

  const listHr = await service.listDocuments(hrAdmin, { page: 1, limit: 10 });
  assert.equal(listHr.data.length, 2);
});

test('unlinked own scope cannot list or count another employee documents', async () => {
  const service = createDocumentsService(createMemoryDocumentsRepository());
  const access = {
    userId: 'unlinked',
    employeeId: null,
    departmentId: null,
    scope: 'own' as const,
  };
  await assert.rejects(
    service.listDocuments(access, { page: 1, limit: 20 }),
    (e: unknown) => e instanceof HttpError && e.status === 403,
  );
  await assert.rejects(
    service.getPendingCount(access),
    (e: unknown) => e instanceof HttpError && e.status === 403,
  );
});

test('spoofed files are removed; uncertain persistence retains bytes to avoid losing a committed document', async () => {
  const repo = createMemoryDocumentsRepository(),
    access = {
      userId: 'u',
      employeeId: 'emp',
      departmentId: 1,
      scope: 'own' as const,
    };
  const metadata = {
    category: 'OTHER' as const,
    title: 'Test certificate',
    documentType: 'Certificate',
    expiryDate: null,
  };
  const bad = testPdf();
  fs.writeFileSync(bad, '<html>unsafe</html>');
  await assert.rejects(
    createDocumentsService(repo).uploadDocument(access, metadata, {
      path: bad,
      originalname: 'certificate.pdf',
      mimetype: 'application/pdf',
      size: 19,
    } as Express.Multer.File),
  );
  assert.equal(fs.existsSync(bad), false);
  const good = testPdf();
  await assert.rejects(
    createDocumentsService({
      ...repo,
      create: async () => {
        throw new Error('Database unavailable');
      },
    }).uploadDocument(access, metadata, {
      path: good,
      originalname: 'certificate.pdf',
      mimetype: 'application/pdf',
      size: 14,
    } as Express.Multer.File),
    (e: unknown) => e instanceof HttpError && e.status === 503,
  );
  assert.equal(fs.existsSync(good), true);
});
