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

/**
 * Adds missing roles, permissions, default grants, departments and
 * designations. Never removes or overwrites anything, so changes made later
 * in the app are kept. Used by `npm run db:seed` and the database tests.
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
}
