import 'dotenv/config';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { newPasswordSchema } from '../modules/auth/auth.schema.js';
import { BCRYPT_COST } from '../modules/auth/auth.service.js';
import { createPrismaClient } from './prisma.js';
import { seedReferenceData } from './reference-data.js';

// Demo logins for trying each role, until JCET's real staff are imported.
const DEMO_ACCOUNTS = [
  [
    'zeeshan.faculty@jcethbl.edu.in',
    'Faculty',
    'JCET-CSE-001',
    'Zeeshan',
    'Madras',
    'CSE',
    'Assistant Professor',
  ],
  [
    'hod.cse@jcethbl.edu.in',
    'HOD',
    'JCET-CSE-002',
    'Rajesh',
    'Kulkarni',
    'CSE',
    'Professor',
  ],
  [
    'principal@jcethbl.edu.in',
    'Principal',
    'JCET-ADMIN-001',
    'Suresh',
    'Patil',
    'ADMIN',
    'Professor',
  ],
  [
    'hr@jcethbl.edu.in',
    'HR Admin',
    'JCET-ADMIN-002',
    'Ananya',
    'Deshmukh',
    'ADMIN',
    'Assistant Registrar / HR Officer',
  ],
  [
    'lab.cse@jcethbl.edu.in',
    'Non-Teaching Staff',
    'JCET-CSE-004',
    'Ramesh',
    'Kumar',
    'CSE',
    'Lab Instructor',
  ],
  // System account: no employee record.
  ['zeeshan@jcethbl.edu.in', 'Super Admin'],
] as const;

const parsed = z
  .object({
    DATABASE_URL: z.url(),
    SEED_ADMIN_EMAIL: z.email().transform((email) => email.toLowerCase()),
    SEED_ADMIN_PASSWORD: newPasswordSchema,
    // Optional: also create the demo accounts below, all with this password.
    SEED_DEMO_PASSWORD: newPasswordSchema.optional(),
  })
  .safeParse(process.env);
if (!parsed.success) {
  console.error(
    'Seeding needs DATABASE_URL, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12–72 bytes):',
    parsed.error.issues.map((issue) => issue.path.join('.')).join(', '),
  );
  process.exit(1);
}
const env = parsed.data;
const prisma = createPrismaClient(env.DATABASE_URL);

try {
  await seedReferenceData(prisma);
  const existing = await prisma.user.findUnique({
    where: { email: env.SEED_ADMIN_EMAIL },
  });
  if (existing) {
    console.log(
      `Roles, permissions, departments and designations ready. ${env.SEED_ADMIN_EMAIL} already exists; unchanged.`,
    );
  } else {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: 'Super Admin' },
    });
    await prisma.user.create({
      data: {
        email: env.SEED_ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(env.SEED_ADMIN_PASSWORD, BCRYPT_COST),
        roleId: role.id,
      },
    });
    console.log(
      `Roles, permissions, departments and designations ready. Created Super Admin ${env.SEED_ADMIN_EMAIL}.`,
    );
  }
  if (env.SEED_DEMO_PASSWORD) {
    const passwordHash = await bcrypt.hash(env.SEED_DEMO_PASSWORD, BCRYPT_COST);
    for (const [
      email,
      roleName,
      code,
      firstName,
      lastName,
      dept,
      designation,
    ] of DEMO_ACCOUNTS) {
      if (await prisma.user.findUnique({ where: { email } })) {
        console.log(`Demo ${email} already exists; unchanged.`);
        continue;
      }
      await prisma.$transaction(async (tx) => {
        const role = await tx.role.findUniqueOrThrow({
          where: { name: roleName },
        });
        let employeeId: string | undefined;
        if (code) {
          const department = await tx.department.findUniqueOrThrow({
            where: { code: dept },
          });
          const employee = await tx.employee.create({
            data: {
              employeeCode: code,
              firstName,
              lastName,
              email,
              departmentId: department.id,
              designationId: (
                await tx.designation.findUniqueOrThrow({
                  where: { name: designation },
                })
              ).id,
              employmentType: 'PERMANENT',
              joiningDate: new Date('2026-01-01'),
            },
          });
          employeeId = employee.id;
          if (roleName === 'HOD' && !department.hodEmployeeId) {
            await tx.department.update({
              where: { id: department.id },
              data: { hodEmployeeId: employee.id },
            });
          }
        }
        await tx.user.create({
          data: { email, passwordHash, roleId: role.id, employeeId },
        });
      });
      console.log(`Created demo ${roleName} ${email}.`);
    }
  }
} finally {
  await prisma.$disconnect();
}
