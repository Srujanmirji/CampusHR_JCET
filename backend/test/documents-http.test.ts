import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import express from 'express';
import bcrypt from 'bcrypt';
import { createMemoryAuthRepository, unusedPrisma } from './fakes.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import { createDocumentsService } from '../src/modules/documents/documents.service.js';
import { createDocumentsRouter } from '../src/modules/documents/documents.routes.js';
import type {
  DocumentsRepository,
  DocumentWithRelations,
} from '../src/modules/documents/documents.repository.js';
import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middleware/error.js';
import { envSchema } from '../src/config/env.js';

test('HTTP documents enforce ownership, private content and upload cleanup', async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'campushr-http-docs-'),
  );
  const employeeId = randomUUID(),
    otherId = randomUUID();
  const records: DocumentWithRelations[] = [];
  const repo = {
    async create(input) {
      const row = {
        ...input,
        id: randomUUID(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DocumentWithRelations;
      records.push(row);
      return row;
    },
    async findById(id) {
      return records.find((row) => row.id === id) ?? null;
    },
    async findMany({ employeeId: own }) {
      const data = records.filter((row) => row.employeeId === own);
      return { data, total: data.length, page: 1, totalPages: 1 };
    },
    async countPending(own) {
      return records.filter((row) => row.employeeId === own).length;
    },
  } satisfies Pick<
    DocumentsRepository,
    'create' | 'findById' | 'findMany' | 'countPending'
  >;
  const passwordHash = await bcrypt.hash('document-test-only', 4);
  const users = [employeeId, otherId].map((id, i) => ({
    id: randomUUID(),
    email: `docs${i}@jcet.test`,
    role: 'Faculty',
    permissions: ['document.upload.own', 'document.read.own'],
    status: 'ACTIVE' as const,
    employeeId: id,
    departmentId: 1,
    passwordHash,
  }));
  const memory = createMemoryAuthRepository(users);
  const env = envSchema.parse({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://localhost/test',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
    CORS_ORIGIN: 'http://localhost:5173',
  });
  const auth = createAuthService(memory.repo, env.JWT_ACCESS_SECRET);
  const tokens = await Promise.all(
    users.map((user) => auth.login(user.email, 'document-test-only', {})),
  );
  const app = express();
  app.use(
    '/api/v1/documents',
    createDocumentsRouter(
      auth,
      createDocumentsService(repo as DocumentsRepository),
      directory,
    ),
  );
  app.use(
    createApp(env, { prisma: unusedPrisma, authRepository: memory.repo }),
  );
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  const upload = async (bytes: string, expiry = '') => {
    const form = new FormData();
    form.append('title', 'Test certificate');
    form.append('documentType', 'Certificate');
    form.append('category', 'OTHER');
    form.append('expiryDate', expiry);
    form.append(
      'file',
      new Blob([bytes], { type: 'application/pdf' }),
      'certificate.pdf',
    );
    return fetch(`${base}/api/v1/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens[0].accessToken}` },
      body: form,
    });
  };
  try {
    const uploaded = await upload('%PDF-1.4\n%%EOF');
    assert.equal(uploaded.status, 201);
    const { data } = (await uploaded.json()) as { data: DocumentWithRelations };
    assert.equal(data.employeeId, employeeId);
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(
        `${base}/api/v1/documents/${data.id}/content`,
        {
          method,
          headers: { Authorization: `Bearer ${tokens[0].accessToken}` },
        },
      );
      assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control')!, /private, no-store/);
      assert.match(response.headers.get('content-type')!, /application\/pdf/);
      assert.equal(Number(response.headers.get('content-length')), 14);
      if (method === 'GET')
        assert.equal(await response.text(), '%PDF-1.4\n%%EOF');
    }
    assert.equal((await fetch(`${base}${data.fileUrl}`)).status, 404);
    assert.equal(
      (await fetch(`${base}/api/v1/documents/${data.id}/content`)).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/documents/${data.id}/content`, {
          headers: { Authorization: `Bearer ${tokens[1].accessToken}` },
        })
      ).status,
      403,
    );
    assert.equal((await upload('<html>spoof</html>')).status, 400);
    assert.equal((await upload('%PDF-1.4\n%%EOF', '2026-02-31')).status, 400);
    assert.equal(
      (await upload('%PDF-' + 'x'.repeat(10 * 1024 * 1024))).status,
      400,
    );
    assert.equal(fs.readdirSync(directory).length, 1);
    const listed = await fetch(
      `${base}/api/v1/documents?employeeId=${employeeId}`,
      { headers: { Authorization: `Bearer ${tokens[1].accessToken}` } },
    );
    assert.deepEqual(((await listed.json()) as { data: unknown[] }).data, []);
    const actualLocator = records[0].fileUrl;
    records[0].fileUrl = '/uploads/documents/../outside.pdf';
    assert.equal(
      (
        await fetch(`${base}/api/v1/documents/${data.id}/content`, {
          headers: { Authorization: `Bearer ${tokens[0].accessToken}` },
        })
      ).status,
      404,
    );
    const link = path.join(directory, 'link.pdf');
    fs.symlinkSync(path.join(directory, path.basename(actualLocator)), link);
    records[0].fileUrl = '/uploads/documents/link.pdf';
    assert.equal(
      (
        await fetch(`${base}/api/v1/documents/${data.id}/content`, {
          headers: { Authorization: `Bearer ${tokens[0].accessToken}` },
        })
      ).status,
      400,
    );
    fs.unlinkSync(link);
    records[0].fileUrl = actualLocator;
    const originalCreate = repo.create;
    repo.create = async (input) => {
      await originalCreate(input);
      throw new Error('Commit response lost');
    };
    assert.equal((await upload('%PDF-1.4\n%%EOF')).status, 503);
    assert.equal(
      fs.readdirSync(directory).length,
      2,
      'An uncertain commit must not delete a possibly stored document',
    );
    const retained = await fetch(
      `${base}/api/v1/documents/${records[1].id}/content`,
      { headers: { Authorization: `Bearer ${tokens[0].accessToken}` } },
    );
    assert.equal(retained.status, 200);
    assert.equal(await retained.text(), '%PDF-1.4\n%%EOF');
  } finally {
    server.closeAllConnections();
    server.close();
    await once(server, 'close');
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
