-- CreateEnum
CREATE TYPE "attendance_status" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE');

-- CreateEnum
CREATE TYPE "attendance_source" AS ENUM ('WEB', 'MOBILE', 'BIOMETRIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "correction_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "status" "attendance_status" NOT NULL DEFAULT 'PRESENT',
    "source" "attendance_source" NOT NULL DEFAULT 'WEB',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_corrections" (
    "id" UUID NOT NULL,
    "attendance_id" UUID,
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "requested_check_in" TIMESTAMP(3),
    "requested_check_out" TIMESTAMP(3),
    "requested_status" "attendance_status" NOT NULL DEFAULT 'PRESENT',
    "reason" TEXT NOT NULL,
    "status" "correction_status" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_settings" (
    "id" SERIAL NOT NULL,
    "work_day_start" TEXT NOT NULL DEFAULT '09:00',
    "work_day_end" TEXT NOT NULL DEFAULT '17:00',
    "grace_period_minutes" INTEGER NOT NULL DEFAULT 15,
    "half_day_hours" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "full_day_hours" DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employee_id_date_key" ON "attendance"("employee_id", "date");
CREATE INDEX "attendance_date_idx" ON "attendance"("date");
CREATE INDEX "attendance_employee_id_date_idx" ON "attendance"("employee_id", "date");

-- CreateIndex
CREATE INDEX "attendance_corrections_employee_id_date_idx" ON "attendance_corrections"("employee_id", "date");
CREATE INDEX "attendance_corrections_status_idx" ON "attendance_corrections"("status");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
