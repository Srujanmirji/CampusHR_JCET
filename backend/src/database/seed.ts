import 'dotenv/config';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { newPasswordSchema } from '../modules/auth/auth.schema.js';
import { BCRYPT_COST } from '../modules/auth/auth.service.js';
import { createPrismaClient } from './prisma.js';

// product/USER_ROLES.md
const ROLES = [
  'Super Admin',
  'HR Admin',
  'Principal',
  'HOD',
  'Faculty',
  'Non-Teaching Staff',
];

const parsed = z
  .object({
    DATABASE_URL: z.url(),
    SEED_ADMIN_EMAIL: z.email().transform((email) => email.toLowerCase()),
    SEED_ADMIN_PASSWORD: newPasswordSchema,
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
  for (const name of ROLES) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  const existing = await prisma.user.findUnique({
    where: { email: env.SEED_ADMIN_EMAIL },
  });
  if (existing) {
    console.log(
      `Roles ready. ${env.SEED_ADMIN_EMAIL} already exists; unchanged.`,
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
    console.log(`Roles ready. Created Super Admin ${env.SEED_ADMIN_EMAIL}.`);
  }
} finally {
  await prisma.$disconnect();
}
