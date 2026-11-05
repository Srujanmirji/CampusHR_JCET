import type { PrismaClient } from '../../generated/prisma/client.js';
import type { Notifier } from '../notifications/notifications.service.js';

export interface ExpiryCheckResult {
  checkedCount: number;
  expiringCount: number;
  notifiedCount: number;
}

/**
 * Checks for documents that are approaching expiration or recently expired,
 * and sends notification reminders to both the employee and HR Admin.
 */
export async function checkDocumentExpirations(
  prisma: PrismaClient,
  notifier?: Notifier,
  now = new Date(),
): Promise<ExpiryCheckResult> {
  const in30Days = new Date(+now + 30 * 24 * 60 * 60 * 1000);
  const past7Days = new Date(+now - 7 * 24 * 60 * 60 * 1000);

  const expiringDocs = await prisma.document.findMany({
    where: {
      status: 'VERIFIED',
      expiryDate: {
        not: null,
        lte: in30Days,
        gte: past7Days,
      },
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

  let notifiedCount = 0;
  const sevenDaysAgo = new Date(+now - 7 * 24 * 60 * 60 * 1000);

  for (const doc of expiringDocs) {
    if (!doc.expiryDate) continue;

    // Check if a reminder was already dispatched in the past 7 days for this document
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        kind: 'document.expiring',
        createdAt: { gte: sevenDaysAgo },
        body: { contains: doc.title },
      },
      select: { id: true },
    });

    if (alreadyNotified) continue;

    const diffMs = +doc.expiryDate - +now;
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    const formattedDate = doc.expiryDate.toISOString().split('T')[0];
    const urgencyText =
      diffDays <= 0
        ? 'has expired'
        : `expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`;

    if (notifier) {
      // 1. Notify the individual employee
      await notifier.notifyEmployee(doc.employeeId, {
        kind: 'document.expiring',
        title: `Document Expiry Reminder: ${doc.title}`,
        body: `Your document "${doc.title}" (${doc.documentType}) ${urgencyText} (${formattedDate}). Please upload an updated copy to keep your profile compliant.`,
        link: '/documents',
      });

      // 2. Notify HR Admin
      await notifier.notifyRole('HR Admin', null, {
        kind: 'document.expiring',
        title: `Document Expiry Notice: ${doc.employee.firstName} ${doc.employee.lastName}`,
        body: `${doc.employee.firstName} ${doc.employee.lastName} (${doc.employee.employeeCode}) has document "${doc.title}" that ${urgencyText} (${formattedDate}).`,
        link: '/documents',
      });

      notifiedCount++;
    }
  }

  return {
    checkedCount: expiringDocs.length,
    expiringCount: expiringDocs.length,
    notifiedCount,
  };
}

/**
 * Starts a recurring background job that checks for expiring documents.
 * Defaults to checking once every 24 hours with an initial run after 10 seconds.
 */
export function startDocumentExpiryWorker(
  prisma: PrismaClient,
  notifier?: Notifier,
  intervalMs = 24 * 60 * 60 * 1000,
) {
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      await checkDocumentExpirations(prisma, notifier);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.warn('Document expiry check worker encountered an error:', msg);
    } finally {
      running = false;
    }
  };

  // Run initial check after 10 seconds of startup
  const initial = setTimeout(run, 10000).unref();
  const timer = setInterval(run, intervalMs).unref();

  return async () => {
    clearTimeout(initial);
    clearInterval(timer);
  };
}
