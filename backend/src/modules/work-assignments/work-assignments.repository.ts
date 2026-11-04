import type {
  PrismaClient,
  WorkCategory,
  WorkPriority,
  WorkStatus,
} from '../../generated/prisma/client.js';

export interface WorkAssignmentRecord {
  id: string;
  title: string;
  description: string;
  category: WorkCategory;
  priority: WorkPriority;
  status: WorkStatus;
  assignedById: string;
  assignedBy: {
    id: string;
    email: string;
    role?: { id: number; name: string };
    employee?: {
      id: string;
      firstName: string;
      lastName: string;
      department?: { id: number; name: string };
    } | null;
  };
  assignedToId: string;
  assignedTo: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    departmentId: number;
    department?: { id: number; code: string; name: string };
    designation?: { id: number; name: string };
    phone: string | null;
    email: string;
  };
  dueDate: Date;
  attachmentUrl: string | null;
  attachmentName: string | null;
  submissionNotes: string | null;
  submissionAttachmentUrl: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewFeedback: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkAssignmentRepository {
  findAssignmentById(id: string): Promise<WorkAssignmentRecord | null>;
  listAssignments(filters: {
    assignedToId?: string;
    assignedById?: string;
    departmentId?: number;
    status?: WorkStatus;
    priority?: WorkPriority;
    category?: WorkCategory;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: WorkAssignmentRecord[]; total: number }>;
  createAssignment(data: {
    title: string;
    description: string;
    category: WorkCategory;
    priority: WorkPriority;
    assignedById: string;
    assignedToId: string;
    dueDate: Date;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
  }): Promise<WorkAssignmentRecord>;
  updateAssignment(
    id: string,
    data: Partial<{
      status: WorkStatus;
      submissionNotes: string | null;
      submissionAttachmentUrl: string | null;
      submittedAt: Date | null;
      reviewedAt: Date | null;
      reviewFeedback: string | null;
      completedAt: Date | null;
    }>,
  ): Promise<WorkAssignmentRecord>;
  findEmployeeById(id: string): Promise<{
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    departmentId: number;
    status: string;
  } | null>;
  countMetrics(options?: {
    assignedToId?: string;
    assignedById?: string;
  }): Promise<{
    assigned: number;
    inProgress: number;
    submitted: number;
    completed: number;
  }>;
}

const workSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  priority: true,
  status: true,
  assignedById: true,
  assignedBy: {
    select: {
      id: true,
      email: true,
      role: { select: { id: true, name: true } },
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
  },
  assignedToId: true,
  assignedTo: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      departmentId: true,
      department: { select: { id: true, code: true, name: true } },
      designation: { select: { id: true, name: true } },
      phone: true,
      email: true,
    },
  },
  dueDate: true,
  attachmentUrl: true,
  attachmentName: true,
  submissionNotes: true,
  submissionAttachmentUrl: true,
  submittedAt: true,
  reviewedAt: true,
  reviewFeedback: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function createWorkAssignmentRepository(
  prisma: PrismaClient,
): WorkAssignmentRepository {
  return {
    async findAssignmentById(id) {
      return prisma.workAssignment.findUnique({
        where: { id },
        select: workSelect,
      });
    },

    async listAssignments(filters) {
      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 20;
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (filters.assignedToId) where.assignedToId = filters.assignedToId;
      if (filters.assignedById) where.assignedById = filters.assignedById;
      if (filters.status) where.status = filters.status;
      if (filters.priority) where.priority = filters.priority;
      if (filters.category) where.category = filters.category;
      if (filters.departmentId) {
        where.assignedTo = { departmentId: filters.departmentId };
      }
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.workAssignment.findMany({
          where,
          select: workSelect,
          orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
          skip,
          take: pageSize,
        }),
        prisma.workAssignment.count({ where }),
      ]);

      return { items, total };
    },

    async createAssignment(data) {
      return prisma.workAssignment.create({
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          status: 'ASSIGNED',
          assignedById: data.assignedById,
          assignedToId: data.assignedToId,
          dueDate: data.dueDate,
          attachmentUrl: data.attachmentUrl ?? null,
          attachmentName: data.attachmentName ?? null,
        },
        select: workSelect,
      });
    },

    async updateAssignment(id, data) {
      return prisma.workAssignment.update({
        where: { id },
        data,
        select: workSelect,
      });
    },

    async findEmployeeById(id) {
      return prisma.employee.findUnique({
        where: { id },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          departmentId: true,
          status: true,
        },
      });
    },

    async countMetrics(options) {
      const where: any = {};
      if (options?.assignedToId) where.assignedToId = options.assignedToId;
      if (options?.assignedById) where.assignedById = options.assignedById;

      const [assigned, inProgress, submitted, completed] = await Promise.all([
        prisma.workAssignment.count({ where: { ...where, status: 'ASSIGNED' } }),
        prisma.workAssignment.count({
          where: { ...where, status: 'IN_PROGRESS' },
        }),
        prisma.workAssignment.count({
          where: { ...where, status: 'SUBMITTED' },
        }),
        prisma.workAssignment.count({
          where: { ...where, status: 'COMPLETED' },
        }),
      ]);

      return { assigned, inProgress, submitted, completed };
    },
  };
}
