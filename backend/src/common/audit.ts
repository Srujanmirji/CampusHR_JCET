import type { Prisma } from '../generated/prisma/client.js';

export interface AuditEntry {
  actorUserId: string;
  action: string;
  resource: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

// Call inside the same transaction as the change, so neither exists without
// the other (backend/SECURITY.md: audit sensitive mutations).
export async function writeAudit(
  tx: Prisma.TransactionClient,
  { before, after, ...entry }: AuditEntry,
) {
  await tx.auditLog.create({
    data: {
      ...entry,
      beforeJson: toJson(before),
      afterJson: toJson(after),
    },
  });
}

// Dates become ISO strings; undefined stays absent.
const toJson = (value: unknown) =>
  value === undefined
    ? undefined
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
