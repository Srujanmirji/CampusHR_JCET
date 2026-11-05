import type {
  CircularAudience,
  CircularCategory,
  CircularPriority,
  PrismaClient,
} from '../../generated/prisma/client.js';

export interface CircularRecord {
  id: string;
  circularNumber: string;
  title: string;
  content: string;
  category: CircularCategory;
  priority: CircularPriority;
  targetAudience: CircularAudience;
  targetDepartmentId: number | null;
  targetDepartment?: { id: number; code: string; name: string } | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  isPublished: boolean;
  publishedAt: Date;
  expiresAt: Date | null;
  createdById: string;
  createdBy?: {
    id: string;
    email: string;
    employee?: {
      id: string;
      firstName: string;
      lastName: string;
      department?: { id: number; name: string };
    } | null;
  };
  hasRead?: boolean;
  readAt?: Date | null;
  _count?: { receipts: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadReceiptRecord {
  id: string;
  circularId: string;
  userId: string;
  readAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  user: {
    id: string;
    email: string;
    employee?: {
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      department?: { id: number; code: string; name: string };
      designation?: { id: number; name: string };
    } | null;
  };
}

export interface CircularRepository {
  findCircularById(
    id: string,
    currentUserId?: string,
  ): Promise<CircularRecord | null>;
  listCirculars(
    filters: {
      category?: CircularCategory;
      priority?: CircularPriority;
      targetAudience?: CircularAudience;
      departmentId?: number;
      search?: string;
      userScope?: {
        isTeaching?: boolean;
        departmentId?: number | null;
        isAdmin?: boolean;
      };
      page?: number;
      pageSize?: number;
    },
    currentUserId?: string,
  ): Promise<{ items: CircularRecord[]; total: number }>;
  createCircular(data: {
    circularNumber: string;
    title: string;
    content: string;
    category: CircularCategory;
    priority: CircularPriority;
    targetAudience: CircularAudience;
    targetDepartmentId?: number | null;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    isPublished: boolean;
    expiresAt?: Date | null;
    createdById: string;
  }): Promise<CircularRecord>;
  updateCircular(
    id: string,
    data: Partial<{
      title: string;
      content: string;
      category: CircularCategory;
      priority: CircularPriority;
      targetAudience: CircularAudience;
      targetDepartmentId: number | null;
      attachmentUrl: string | null;
      attachmentName: string | null;
      isPublished: boolean;
      expiresAt: Date | null;
    }>,
  ): Promise<CircularRecord>;
  recordReadReceipt(
    circularId: string,
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<void>;
  getReadReceipts(circularId: string): Promise<ReadReceiptRecord[]>;
  countEligibleAudience(
    targetAudience: CircularAudience,
    targetDepartmentId?: number | null,
  ): Promise<number>;
  getNextCircularNumber(): Promise<string>;
}

const circularSelect = {
  id: true,
  circularNumber: true,
  title: true,
  content: true,
  category: true,
  priority: true,
  targetAudience: true,
  targetDepartmentId: true,
  targetDepartment: { select: { id: true, code: true, name: true } },
  attachmentUrl: true,
  attachmentName: true,
  isPublished: true,
  publishedAt: true,
  expiresAt: true,
  createdById: true,
  createdBy: {
    select: {
      id: true,
      email: true,
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
  _count: { select: { receipts: true } },
  createdAt: true,
  updatedAt: true,
} as const;

export function createCircularRepository(prisma: PrismaClient): CircularRepository {
  return {
    async findCircularById(id, currentUserId) {
      const circular = await prisma.circular.findUnique({
        where: { id },
        select: circularSelect,
      });
      if (!circular) return null;

      let hasRead = false;
      let readAt: Date | null = null;
      if (currentUserId) {
        const receipt = await prisma.circularReadReceipt.findUnique({
          where: {
            circularId_userId: { circularId: id, userId: currentUserId },
          },
          select: { readAt: true },
        });
        if (receipt) {
          hasRead = true;
          readAt = receipt.readAt;
        }
      }

      return {
        ...circular,
        hasRead,
        readAt,
      };
    },

    async listCirculars(filters, currentUserId) {
      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 20;
      const skip = (page - 1) * pageSize;

      const where: any = { isPublished: true };

      if (filters.category) where.category = filters.category;
      if (filters.priority) where.priority = filters.priority;

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { circularNumber: { contains: filters.search, mode: 'insensitive' } },
          { content: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Audience scoping: if not admin, only show matching audience
      if (filters.userScope && !filters.userScope.isAdmin) {
        const audienceConditions: any[] = [{ targetAudience: 'ALL' }];

        if (filters.userScope.isTeaching) {
          audienceConditions.push({ targetAudience: 'TEACHING_ONLY' });
        } else {
          audienceConditions.push({ targetAudience: 'NON_TEACHING_ONLY' });
        }

        if (filters.userScope.departmentId) {
          audienceConditions.push({
            targetAudience: 'DEPARTMENT',
            targetDepartmentId: filters.userScope.departmentId,
          });
        }

        where.AND = [{ OR: audienceConditions }];
      } else if (filters.targetAudience) {
        where.targetAudience = filters.targetAudience;
      }

      const [items, total] = await Promise.all([
        prisma.circular.findMany({
          where,
          select: circularSelect,
          orderBy: { publishedAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.circular.count({ where }),
      ]);

      // If currentUserId provided, batch query which ones they have read
      let readCircularIds = new Set<string>();
      if (currentUserId && items.length > 0) {
        const receipts = await prisma.circularReadReceipt.findMany({
          where: {
            userId: currentUserId,
            circularId: { in: items.map((i) => i.id) },
          },
          select: { circularId: true },
        });
        readCircularIds = new Set(receipts.map((r) => r.circularId));
      }

      return {
        items: items.map((i) => ({
          ...i,
          hasRead: readCircularIds.has(i.id),
        })),
        total,
      };
    },

    async createCircular(data) {
      return prisma.circular.create({
        data,
        select: circularSelect,
      });
    },

    async updateCircular(id, data) {
      return prisma.circular.update({
        where: { id },
        data,
        select: circularSelect,
      });
    },

    async recordReadReceipt(circularId, userId, meta) {
      await prisma.circularReadReceipt.upsert({
        where: {
          circularId_userId: { circularId, userId },
        },
        create: {
          circularId,
          userId,
          readAt: new Date(),
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
        update: {},
      });
    },

    async getReadReceipts(circularId) {
      return prisma.circularReadReceipt.findMany({
        where: { circularId },
        select: {
          id: true,
          circularId: true,
          userId: true,
          readAt: true,
          ipAddress: true,
          userAgent: true,
          user: {
            select: {
              id: true,
              email: true,
              employee: {
                select: {
                  id: true,
                  employeeCode: true,
                  firstName: true,
                  lastName: true,
                  department: { select: { id: true, code: true, name: true } },
                  designation: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { readAt: 'desc' },
      });
    },

    async countEligibleAudience(targetAudience, targetDepartmentId) {
      const where: any = { status: 'ACTIVE' };
      if (targetAudience === 'TEACHING_ONLY') {
        where.employee = { designation: { category: 'TEACHING' } };
      } else if (targetAudience === 'NON_TEACHING_ONLY') {
        where.employee = { designation: { category: 'NON_TEACHING' } };
      } else if (targetAudience === 'DEPARTMENT' && targetDepartmentId) {
        where.employee = { departmentId: targetDepartmentId };
      }
      return prisma.user.count({ where });
    },

    async getNextCircularNumber() {
      const year = new Date().getFullYear();
      const prefix = `JCET/CIR/${year}/`;
      const count = await prisma.circular.count({
        where: { circularNumber: { startsWith: prefix } },
      });
      const nextNum = String(count + 1).padStart(3, '0');
      return `${prefix}${nextNum}`;
    },
  };
}
