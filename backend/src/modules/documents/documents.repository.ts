import type {
  Document,
  DocumentCategory,
  DocumentStatus,
  Prisma,
  PrismaClient,
} from '../../generated/prisma/client.js';

export interface DocumentWithRelations extends Document {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department: { id: number; name: string; code: string };
  };
  reviewedByUser?: {
    id: string;
    email: string;
    employee?: { firstName: string; lastName: string } | null;
  } | null;
}

export interface DocumentsRepository {
  create(data: {
    employeeId: string;
    category: DocumentCategory;
    title: string;
    documentType: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    expiryDate?: Date | null;
  }): Promise<DocumentWithRelations>;

  findById(id: string): Promise<DocumentWithRelations | null>;

  findMany(params: {
    employeeId?: string;
    category?: DocumentCategory;
    status?: DocumentStatus;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{
    data: DocumentWithRelations[];
    total: number;
    page: number;
    totalPages: number;
  }>;

  updateStatus(
    id: string,
    data: {
      status: DocumentStatus;
      reviewedByUserId: string;
      reviewNote?: string | null;
      reviewedAt: Date;
    },
  ): Promise<DocumentWithRelations>;

  delete(id: string): Promise<Document>;

  countPending(employeeId?: string): Promise<number>;
}

export function createDocumentsRepository(
  prisma: PrismaClient,
): DocumentsRepository {
  return {
    async create(data) {
      return prisma.document.create({
        data: {
          employeeId: data.employeeId,
          category: data.category,
          title: data.title,
          documentType: data.documentType,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          expiryDate: data.expiryDate ?? null,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });
    },

    async findById(id) {
      return prisma.document.findUnique({
        where: { id },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: { select: { id: true, name: true, code: true } },
            },
          },
          reviewedByUser: {
            select: {
              id: true,
              email: true,
              employee: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
    },

    async findMany({ employeeId, category, status, search, page, limit }) {
      const where: Prisma.DocumentWhereInput = {};

      if (employeeId) {
        where.employeeId = employeeId;
      }
      if (category) {
        where.category = category;
      }
      if (status) {
        where.status = status;
      }
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { documentType: { contains: search, mode: 'insensitive' } },
          {
            employee: { firstName: { contains: search, mode: 'insensitive' } },
          },
          { employee: { lastName: { contains: search, mode: 'insensitive' } } },
          {
            employee: {
              employeeCode: { contains: search, mode: 'insensitive' },
            },
          },
        ];
      }

      const skip = (page - 1) * limit;

      const [total, data] = await Promise.all([
        prisma.document.count({ where }),
        prisma.document.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                department: { select: { id: true, name: true, code: true } },
              },
            },
            reviewedByUser: {
              select: {
                id: true,
                email: true,
                employee: { select: { firstName: true, lastName: true } },
              },
            },
          },
        }),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      };
    },

    async updateStatus(id, data) {
      return prisma.document.update({
        where: { id },
        data: {
          status: data.status,
          reviewedByUserId: data.reviewedByUserId,
          reviewNote: data.reviewNote ?? null,
          reviewedAt: data.reviewedAt,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });
    },

    async delete(id) {
      return prisma.document.delete({
        where: { id },
      });
    },

    async countPending(employeeId) {
      return prisma.document.count({
        where: {
          status: 'PENDING',
          ...(employeeId ? { employeeId } : {}),
        },
      });
    },
  };
}
