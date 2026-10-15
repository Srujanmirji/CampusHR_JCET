import type { PrismaClient } from '../generated/prisma/client.js';
import { defaultGrants, ROLES } from '../modules/auth/permissions.js';

// Starting reference data; HR edits departments in the app afterwards.
const DEPARTMENTS = [
  ['CSE', 'Computer Science & Engineering'],
  ['ECE', 'Electronics & Communication Engineering'],
  ['ME', 'Mechanical Engineering'],
  ['CE', 'Civil Engineering'],
  ['AIML', 'Artificial Intelligence & Machine Learning'],
  ['MBA', 'Master of Business Administration'],
  ['ADMIN', 'Administration'],
] as const;
const DESIGNATIONS = [
  ['Professor', 1, 'TEACHING'],
  ['Associate Professor', 2, 'TEACHING'],
  ['Assistant Professor', 3, 'TEACHING'],
  ['Assistant Registrar / HR Officer', 2, 'NON_TEACHING'],
  ['Office Superintendent', 3, 'NON_TEACHING'],
  ['System Administrator', 3, 'NON_TEACHING'],
  ['Librarian', 3, 'NON_TEACHING'],
  ['Senior Lab Instructor', 4, 'NON_TEACHING'],
  ['Lab Instructor', 5, 'NON_TEACHING'],
  ['Technical Assistant', 5, 'NON_TEACHING'],
  ['Office Assistant', 6, 'NON_TEACHING'],
] as const;

// The approved timetable grid (frontend/DESIGN.md): seven periods with a
// short break after period 2 and lunch after period 4.
const PERIODS = [
  [1, '09:00', '10:00'],
  [2, '10:00', '10:50'],
  [3, '11:15', '12:15'],
  [4, '12:15', '13:15'],
  [5, '14:00', '15:00'],
  [6, '15:00', '16:00'],
  [7, '16:00', '17:00'],
] as const;

// Starting weekly teaching-hour bands (AICTE caps: 14 / 16 / 18 hours); the
// Principal edits them in the app.
const WORKLOAD_BANDS = [
  ['Professor', 10, 14],
  ['Associate Professor', 12, 16],
  ['Assistant Professor', 14, 18],
] as const;

/**
 * Adds missing roles, permissions, default grants, departments,
 * designations, timetable periods and workload bands. Never removes or
 * overwrites anything, so changes made later in the app are kept. Used by
 * `npm run db:seed` and the database tests.
 */
export async function seedReferenceData(prisma: PrismaClient) {
  for (const name of ROLES) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    for (const key of defaultGrants(name)) {
      const permission = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key.replaceAll('.', ' ') },
      });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
  for (const [code, name] of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code },
      update: {},
      create: { code, name },
    });
  }
  for (const [name, level, category] of DESIGNATIONS) {
    await prisma.designation.upsert({
      where: { name },
      update: {},
      create: { name, level, category },
    });
  }
  for (const [number, startTime, endTime] of PERIODS) {
    await prisma.period.upsert({
      where: { number },
      update: {},
      create: { number, startTime, endTime },
    });
  }
  for (const [name, minHours, maxHours] of WORKLOAD_BANDS) {
    // Skipped if HR has renamed the designation since.
    const designation = await prisma.designation.findUnique({
      where: { name },
    });
    if (!designation) continue;
    await prisma.workloadThreshold.upsert({
      where: { designationId: designation.id },
      update: {},
      create: { designationId: designation.id, minHours, maxHours },
    });
  }
}
