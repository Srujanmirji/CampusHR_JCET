import bcrypt from 'bcrypt';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedReferenceData } from '../../src/database/reference-data.js';
import { BCRYPT_COST } from '../../src/modules/auth/auth.service.js';
import type { RoleName } from '../../src/modules/auth/permissions.js';

// Local-only accounts; this module is used by the loopback demo launcher.
export const demoPassword = 'home-check-only';
const accounts: {
  email: string;
  code: string;
  first: string;
  last: string;
  role: RoleName;
  department: string;
  designation: string;
}[] = [
  {
    email: 'faculty-check@jcet.test',
    code: 'JCET-CSE-021',
    first: 'Asha',
    last: 'Patil',
    role: 'Faculty',
    department: 'CSE',
    designation: 'Assistant Professor',
  },
  {
    email: 'home-check@jcet.test',
    code: 'JCET-CSE-001',
    first: 'Ramesh',
    last: 'Kulkarni',
    role: 'HOD',
    department: 'CSE',
    designation: 'Professor',
  },
  {
    email: 'hr-check@jcet.test',
    code: 'JCET-HR-001',
    first: 'Maya',
    last: 'Desai',
    role: 'HR Admin',
    department: 'ADMIN',
    designation: 'Assistant Registrar / HR Officer',
  },
  {
    email: 'coverage-recipient@jcet.test',
    code: 'JCET-CSE-022',
    first: 'Priya',
    last: 'Kulkarni',
    role: 'Faculty',
    department: 'CSE',
    designation: 'Assistant Professor',
  },
];

export async function seedDemo(prisma: PrismaClient) {
  await seedReferenceData(prisma);
  const people = [];
  for (const account of accounts) {
    const department = await prisma.department.findUniqueOrThrow({
      where: { code: account.department },
    });
    const designation = await prisma.designation.findUniqueOrThrow({
      where: { name: account.designation },
    });
    const employee = await prisma.employee.upsert({
      where: { employeeCode: account.code },
      update: {},
      create: {
        employeeCode: account.code,
        firstName: account.first,
        lastName: account.last,
        email: account.email,
        departmentId: department.id,
        designationId: designation.id,
        employmentType: 'PERMANENT',
        joiningDate: new Date('2020-06-01T00:00:00Z'),
        qualification: 'M.Tech',
        specialization: 'Computer Science',
        experienceYears: 6,
      },
    });
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: account.role },
    });
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {},
      create: {
        email: account.email,
        employeeId: employee.id,
        roleId: role.id,
        passwordHash: await bcrypt.hash(demoPassword, BCRYPT_COST),
      },
    });
    people.push({
      email: account.email,
      role: account.role,
      userId: user.id,
      employeeId: employee.id,
    });
  }
  for (const type of [
    {
      code: 'CL',
      name: 'Casual Leave',
      yearlyQuota: 15,
      allowHalfDay: true,
      carryForwardMax: 0,
    },
    {
      code: 'DL',
      name: 'Duty Leave',
      yearlyQuota: null,
      allowHalfDay: false,
      carryForwardMax: 0,
    },
    {
      code: 'RH',
      name: 'Restricted Holiday',
      yearlyQuota: 2,
      allowHalfDay: true,
      carryForwardMax: 0,
    },
    {
      code: 'EL',
      name: 'Earned Leave',
      yearlyQuota: 30,
      allowHalfDay: false,
      carryForwardMax: 15,
    },
  ])
    await prisma.leaveType.upsert({
      where: { code: type.code },
      update: {},
      create: type,
    });
  const department = await prisma.department.findUniqueOrThrow({
    where: { code: 'CSE' },
  });
  const faculty = people.find(
    (person) => person.email === 'faculty-check@jcet.test',
  )!;
  const cover = people.find(
    (person) => person.email === 'coverage-recipient@jcet.test',
  )!;
  const theory = await prisma.subject.upsert({
    where: { code: 'BCS501' },
    update: {},
    create: {
      code: 'BCS501',
      name: 'Database Management Systems',
      departmentId: department.id,
      semester: 5,
      kind: 'THEORY',
    },
  });
  const lab = await prisma.subject.upsert({
    where: { code: 'BCSL504' },
    update: {},
    create: {
      code: 'BCSL504',
      name: 'Database Management Systems Laboratory',
      departmentId: department.id,
      semester: 5,
      kind: 'LAB',
    },
  });
  const room = await prisma.room.upsert({
    where: { name: 'Room 302' },
    update: {},
    create: { name: 'Room 302', kind: 'CLASSROOM' },
  });
  const labRoom = await prisma.room.upsert({
    where: { name: 'Computer Lab 3' },
    update: {},
    create: { name: 'Computer Lab 3', kind: 'LAB' },
  });
  const entries = [
    {
      id: 'de000000-0000-4000-8000-000000000001',
      facultyId: faculty.employeeId,
      subjectId: theory.id,
      roomId: room.id,
      day: 'MON' as const,
      startPeriod: 1,
      endPeriod: 1,
    },
    {
      id: 'de000000-0000-4000-8000-000000000002',
      facultyId: faculty.employeeId,
      subjectId: lab.id,
      roomId: labRoom.id,
      day: 'MON' as const,
      startPeriod: 3,
      endPeriod: 4,
    },
    {
      id: 'de000000-0000-4000-8000-000000000003',
      facultyId: faculty.employeeId,
      subjectId: theory.id,
      roomId: room.id,
      day: 'SAT' as const,
      startPeriod: 1,
      endPeriod: 1,
    },
    {
      id: 'de000000-0000-4000-8000-000000000004',
      facultyId: cover.employeeId,
      subjectId: theory.id,
      roomId: room.id,
      day: 'WED' as const,
      startPeriod: 1,
      endPeriod: 1,
    },
    {
      id: 'de000000-0000-4000-8000-000000000005',
      facultyId: cover.employeeId,
      subjectId: lab.id,
      roomId: labRoom.id,
      day: 'WED' as const,
      startPeriod: 3,
      endPeriod: 4,
    },
  ];
  for (const entry of entries)
    await prisma.timetableEntry.upsert({
      where: { id: entry.id },
      update: {},
      create: {
        ...entry,
        departmentId: department.id,
        semester: 5,
        section: 'A',
      },
    });
  return people;
}
