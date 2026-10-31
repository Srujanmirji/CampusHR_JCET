// Synthetic records/files for the loopback verification API; never a production store.
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { homeUser, employeeId } from './home-fixtures.mjs';
export const profilePermissions = [
  'employee.read.own',
  'employee.update.own',
  'document.read.own',
  'document.upload.own',
];
export function createProfilePreview(directory) {
  let employee = {
    id: employeeId,
    employeeCode: 'IOS004',
    firstName: 'Home',
    lastName: 'Test',
    email: homeUser.email,
    phone: '+91 98765 43210',
    department: { id: 1, code: 'CSE', name: 'Computer Science' },
    designation: { id: 1, name: 'Associate Professor', category: 'TEACHING' },
    employmentType: 'PERMANENT',
    joiningDate: new Date('2020-06-01T00:00:00Z'),
    qualification: 'M.Tech',
    specialization: 'Computer Science',
    experienceYears: 6,
    status: 'ACTIVE',
    headOf: { id: 1 },
  };
  const employeeRepo = {
    async findOne(where) {
      const matches = (condition) =>
        Object.entries(condition).every(([key, value]) =>
          key === 'AND' ? value.every(matches) : employee[key] === value,
        );
      return matches(where) ? globalThis.structuredClone(employee) : null;
    },
    async findConflict() {
      return null;
    },
    async update(_before, input) {
      employee = { ...employee, ...input };
      return globalThis.structuredClone(employee);
    },
  };
  const records = [];
  const documentRepo = {
    async create(input) {
      const row = {
        ...input,
        id: randomUUID(),
        status: 'PENDING',
        expiryDate: input.expiryDate ?? null,
        reviewNote: null,
        reviewedByUserId: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        employee: {
          id: employeeId,
          firstName: 'Home',
          lastName: 'Test',
          employeeCode: 'IOS004',
          department: employee.department,
        },
      };
      records.unshift(row);
      return row;
    },
    async findById(id) {
      return records.find((row) => row.id === id) ?? null;
    },
    async findMany({ employeeId: own, page, limit }) {
      const all = records.filter((row) => !own || row.employeeId === own);
      return {
        data: all.slice((page - 1) * limit, page * limit),
        page,
        total: all.length,
        totalPages: Math.max(1, Math.ceil(all.length / limit)),
      };
    },
    async countPending(own) {
      return records.filter(
        (row) => (!own || row.employeeId === own) && row.status === 'PENDING',
      ).length;
    },
    async updateStatus(id, input) {
      const row = records.find((row) => row.id === id);
      Object.assign(row, input);
      return row;
    },
    async delete(id) {
      return records.splice(
        records.findIndex((row) => row.id === id),
        1,
      )[0];
    },
  };
  const png = globalThis.Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1cAAAAASUVORK5CYII=',
    'base64',
  );
  fs.writeFileSync(path.join(directory, 'preview.png'), png);
  const input = {
    employeeId,
    category: 'ACADEMIC',
    title: 'Verified certificate',
    documentType: 'Degree certificate',
    fileUrl: '/uploads/documents/preview.png',
    fileName: 'preview.png',
    fileSize: png.length,
    mimeType: 'image/png',
  };
  return {
    employeeRepo,
    documentRepo,
    async seed() {
      await documentRepo.create(input);
      records[0].status = 'VERIFIED';
      await documentRepo.create({ ...input, title: 'Rejected certificate' });
      records[0].status = 'REJECTED';
      records[0].reviewNote = 'Please upload a clearer copy.';
    },
  };
}
