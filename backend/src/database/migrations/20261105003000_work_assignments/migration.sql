-- CreateEnum
CREATE TYPE "WorkPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkCategory" AS ENUM ('ACADEMIC', 'NBA_NAAC', 'EXAMINATION', 'STUDENT_AFFAIR', 'EVENT', 'ADMINISTRATIVE', 'OTHER');

-- CreateTable
CREATE TABLE "work_assignments" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "WorkCategory" NOT NULL DEFAULT 'ADMINISTRATIVE',
    "priority" "WorkPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "WorkStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assigned_by_id" UUID NOT NULL,
    "assigned_to_id" UUID NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "attachment_url" TEXT,
    "attachment_name" TEXT,
    "submission_notes" TEXT,
    "submission_attachment_url" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "review_feedback" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_assignments_assigned_to_id_idx" ON "work_assignments"("assigned_to_id");

-- CreateIndex
CREATE INDEX "work_assignments_assigned_by_id_idx" ON "work_assignments"("assigned_by_id");

-- CreateIndex
CREATE INDEX "work_assignments_due_date_idx" ON "work_assignments"("due_date");

-- CreateIndex
CREATE INDEX "work_assignments_status_idx" ON "work_assignments"("status");

-- CreateIndex
CREATE INDEX "work_assignments_priority_idx" ON "work_assignments"("priority");

-- AddForeignKey
ALTER TABLE "work_assignments" ADD CONSTRAINT "work_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_assignments" ADD CONSTRAINT "work_assignments_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
