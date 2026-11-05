-- AlterEnum
ALTER TYPE "attendance_status" ADD VALUE IF NOT EXISTS 'ON_DUTY';

-- CreateEnum
CREATE TYPE "on_duty_category" AS ENUM ('UNIVERSITY_VALUATION', 'EXTERNAL_EXAMINER', 'CONFERENCE_SEMINAR', 'FDP_WORKSHOP', 'BOS_BOE_MEETING', 'OFFICIAL_COLLEGE_DUTY', 'OTHER');

-- CreateEnum
CREATE TYPE "on_duty_status" AS ENUM ('PENDING', 'RECOMMENDED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "on_duty_requests" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "category" "on_duty_category" NOT NULL DEFAULT 'UNIVERSITY_VALUATION',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" DOUBLE PRECISION NOT NULL,
    "status" "on_duty_status" NOT NULL DEFAULT 'PENDING',
    "attachment_url" TEXT,
    "attachment_name" TEXT,
    "attendance_certificate_url" TEXT,
    "hod_reviewed_by_id" UUID,
    "hod_reviewed_at" TIMESTAMP(3),
    "hod_note" TEXT,
    "final_approved_by_id" UUID,
    "final_approved_at" TIMESTAMP(3),
    "final_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "on_duty_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "on_duty_requests_employee_id_start_date_idx" ON "on_duty_requests"("employee_id", "start_date");

-- CreateIndex
CREATE INDEX "on_duty_requests_status_idx" ON "on_duty_requests"("status");

-- CreateIndex
CREATE INDEX "on_duty_requests_category_idx" ON "on_duty_requests"("category");

-- AddForeignKey
ALTER TABLE "on_duty_requests" ADD CONSTRAINT "on_duty_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "on_duty_requests" ADD CONSTRAINT "on_duty_requests_hod_reviewed_by_id_fkey" FOREIGN KEY ("hod_reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "on_duty_requests" ADD CONSTRAINT "on_duty_requests_final_approved_by_id_fkey" FOREIGN KEY ("final_approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
